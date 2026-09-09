"use client";

import { useState } from "react";
import { inquiryEmailSubject, inquiryMessageTemplate, templateStageLabels, type TemplateStage } from "@/lib/cloud/message-templates";

export function InquiryMessageTemplates({ clientName, inquiryTitle, nextContactOn }: { clientName: string; inquiryTitle: string; nextContactOn: string | null }) {
  const [copied, setCopied] = useState<"message" | "subject" | null>(null);
  const [stage, setStage] = useState<TemplateStage>("new");
  const copy = async (kind: "message" | "subject", value: string) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else {
        const input = document.createElement("textarea");
        input.value = value;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.append(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("Copy failed");
      }
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1800);
    } catch { setCopied(null); }
  };
  const message = inquiryMessageTemplate({ clientName, inquiryTitle, nextContactOn, stage });
  const subject = inquiryEmailSubject(inquiryTitle);
  return <section className="message-templates" aria-label="Шаблоны сообщений">
    <div><p className="eyebrow">ШАБЛОНЫ</p><h3>Связаться с клиентом</h3></div>
    <div className="template-stages" role="group" aria-label="Тип шаблона">{(Object.keys(templateStageLabels) as TemplateStage[]).map(value => <button type="button" key={value} className={stage === value ? "active" : ""} onClick={() => setStage(value)}>{templateStageLabels[value]}</button>)}</div>
    <p>{message}</p>
    <div className="message-template-actions"><button type="button" className="secondary" onClick={() => copy("message", message)}>{copied === "message" ? "Сообщение скопировано" : "Скопировать сообщение"}</button><button type="button" className="secondary" onClick={() => copy("subject", subject)}>{copied === "subject" ? "Тема скопирована" : "Скопировать тему письма"}</button></div>
  </section>;
}
