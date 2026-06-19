import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev =
  process.env.NODE_ENV !== "production" && process.env.npm_lifecycle_event !== "start";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

interface Participant {
  userId: string;
  userName: string;
  role: string;
  socketId: string;
}

interface RoomData {
  participants: Map<string, Participant>;
  state: Record<string, unknown>;
}

const rooms = new Map<string, RoomData>();

function getRoom(interviewId: string): RoomData {
  if (!rooms.has(interviewId)) {
    rooms.set(interviewId, { participants: new Map(), state: {} });
  }
  return rooms.get(interviewId)!;
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    path: "/api/socket",
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    socket.on(
      "join-room",
      (data: { interviewId: string; userId: string; userName: string; role: string }) => {
        const { interviewId, userId, userName, role } = data;
        if (!interviewId || !userId) return;

        socket.join(interviewId);
        socket.data = { interviewId, userId, userName, role };

        const room = getRoom(interviewId);
        room.participants.set(userId, { userId, userName, role, socketId: socket.id });

        socket.emit("room-state", room.state);

        const others = Array.from(room.participants.values()).filter((p) => p.socketId !== socket.id);
        socket.emit("participants-list", others);

        socket.to(interviewId).emit("user-joined", { userId, userName, role, socketId: socket.id });

        console.log(`[socket] ${userName} joined room ${interviewId} (${room.participants.size} users)`);
      }
    );

    // Synchronize global layout toggles across all participants in the room
    socket.on("layout-toggle", ({ tool }) => {
      const { interviewId } = socket.data || {};
      if (!interviewId) return;

      const room = getRoom(interviewId);
      room.state.activeTool = tool;

      socket.to(interviewId).emit("layout-toggle", { tool });
    });

    socket.on("webrtc-offer", ({ targetSocketId, offer }) => {
      io.to(targetSocketId).emit("webrtc-offer", {
        fromSocketId: socket.id,
        fromUserId: socket.data?.userId,
        fromUserName: socket.data?.userName,
        offer,
      });
    });

    socket.on("webrtc-answer", ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit("webrtc-answer", {
        fromSocketId: socket.id,
        answer,
      });
    });

    socket.on("webrtc-ice-candidate", ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit("webrtc-ice-candidate", {
        fromSocketId: socket.id,
        candidate,
      });
    });

    socket.on("code-update", ({ questionId, code, language }) => {
      const { interviewId, userId } = socket.data || {};
      if (!interviewId || !questionId) return;

      const room = getRoom(interviewId);
      room.state[`code-${questionId}`] = { code, language, updatedBy: userId, ts: Date.now() };

      socket.to(interviewId).emit("code-update", { questionId, code, language, userId });
    });

    socket.on("whiteboard-update", ({ questionId, elements, notes, strokes }) => {
      const { interviewId, userId } = socket.data || {};
      if (!interviewId || !questionId) return;

      const room = getRoom(interviewId);
      room.state[`wb-${questionId}`] = { elements, notes, strokes, updatedBy: userId, ts: Date.now() };

      socket.to(interviewId).emit("whiteboard-update", {
        questionId,
        elements,
        notes,
        strokes,
        userId,
      });
    });

    socket.on("room-event", (event) => {
      const { interviewId } = socket.data || {};
      if (!interviewId) return;
      socket.to(interviewId).emit("room-event", event);
    });

    socket.on("question-switch", ({ questionIdx, questionId, title }) => {
      const { interviewId } = socket.data || {};
      if (!interviewId) return;

      const room = getRoom(interviewId);
      room.state.activeQuestion = { questionIdx, questionId, title, ts: Date.now() };

      socket.to(interviewId).emit("question-switch", { questionIdx, questionId, title });
    });

    socket.on("disconnect", () => {
      const { interviewId, userId, userName } = socket.data || {};
      if (interviewId && userId) {
        const room = rooms.get(interviewId);
        if (room) {
          room.participants.delete(userId);
          socket.to(interviewId).emit("user-left", { userId, userName, socketId: socket.id });
        }
        console.log(`[socket] ${userName || userId} left room ${interviewId}`);
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`\nMeetSpace ready at http://${hostname}:${port}`);
    console.log(`Socket.io listening on /api/socket\n`);
  });
});