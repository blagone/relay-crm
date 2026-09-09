export function inquiryMessageTemplate({ clientName, inquiryTitle, nextContactOn }: { clientName: string; inquiryTitle: string; nextContactOn: string | null }) {
  const deadline = nextContactOn ? ` Следующий контакт: ${new Date(`${nextContactOn}T00:00:00Z`).toLocaleDateString("ru-RU")}.` : "";
  return `Здравствуйте, ${clientName}! Пишу по заявке «${inquiryTitle}». Подскажите, пожалуйста, удобно ли сейчас обсудить детали?${deadline}`;
}

export function inquiryEmailSubject(inquiryTitle: string) {
  return `По заявке «${inquiryTitle}»`;
}
