"use client";

import React from "react";
import { Download, FileText, Mail, Phone, Briefcase, GraduationCap, Code } from "lucide-react";
import type { LayoutContext } from "../types";

export function ResumeLayout({ ctx }: { ctx: LayoutContext }) {
  // Mock candidate resume details based on the seeded profile (Parvika Shekhawat)
  const resume = {
    name: "Parvika Shekhawat",
    title: "Full Stack Engineer Intern",
    email: "parvika@gmail.com",
    phone: "+91 98765 43210",
    summary: "Motivated Computer Science undergraduate with hands-on experience in building scalable web applications. Proficient in React, Node.js, Next.js, and SQL databases. Strong problem-solving abilities and collaborative team player.",
    skills: [
      "JavaScript (ES6+)", "TypeScript", "React", "Next.js", "Node.js", 
      "Express", "PostgreSQL", "MongoDB", "Prisma ORM", "HTML5/CSS3", 
      "TailwindCSS", "Git", "REST APIs"
    ],
    experience: [
      {
        role: "Software Engineering Intern",
        company: "TechNexus Solutions",
        period: "May 2025 - July 2025",
        highlights: [
          "Developed and optimized 15+ reusable React components, reducing page load times by 20%.",
          "Integrated RESTful API endpoints with Prisma ORM and PostgreSQL backend.",
          "Collaborated closely with design team to implement responsive UI features."
        ]
      },
      {
        role: "Frontend Developer Contributor",
        company: "OpenSource Project Hub",
        period: "Dec 2024 - Feb 2025",
        highlights: [
          "Contributed to dynamic workspace features using canvas and interactive nodes.",
          "Fixed 25+ bugs relating to WebRTC peer connections and media streaming configurations."
        ]
      }
    ],
    education: [
      {
        degree: "Bachelor of Technology in Computer Science & Engineering",
        school: "State Technical University",
        period: "2022 - 2026",
        score: "CGPA: 8.9 / 10.0"
      }
    ]
  };

  return (
    <div className="flex flex-1 flex-col bg-slate-900 overflow-y-auto p-6 h-full custom-scrollbar select-none text-slate-300">
      <div className="mx-auto max-w-2xl w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden text-slate-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-7 text-white">
          <div className="flex items-center gap-3">
            <FileText className="h-7 w-7 text-orange-100" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{resume.name}</h1>
              <p className="text-orange-100 text-sm font-medium">{resume.title}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-orange-50/90 font-mono">
            <div className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" />
              <span>{resume.email}</span>
            </div>
            <div className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              <span>{resume.phone}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          {/* Summary */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Professional Summary</h2>
            <p className="text-sm leading-relaxed text-slate-600">{resume.summary}</p>
          </div>

          {/* Skills */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Core Skills</h2>
            <div className="flex flex-wrap gap-1.5">
              {resume.skills.map((skill) => (
                <span key={skill} className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-medium text-slate-700">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Work Experience</h2>
            <div className="space-y-4">
              {resume.experience.map((exp) => (
                <div key={exp.company}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">{exp.role}</h3>
                      <p className="text-xs text-slate-500 font-medium">{exp.company}</p>
                    </div>
                    <span className="text-xs font-mono text-slate-400">{exp.period}</span>
                  </div>
                  <ul className="mt-2 list-disc list-inside text-xs text-slate-600 space-y-1 pl-1">
                    {exp.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Education</h2>
            {resume.education.map((edu) => (
              <div key={edu.school} className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{edu.degree}</h3>
                  <p className="text-xs text-slate-500 font-medium">{edu.school} · <span className="font-mono text-emerald-600">{edu.score}</span></p>
                </div>
                <span className="text-xs font-mono text-slate-400">{edu.period}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
