export type TemplateStage = "new" | "contacted" | "proposal" | "won" | "lost";
const stageCopy: Record<TemplateStage, (client: string, title: string) => string> = {
  new: (client, title) => `Здравствуйте, ${client}! Спасибо за интерес к «${title}». Подскажите, пожалуйста, когда будет удобно обсудить детали?`,
  contacted: (client, title) => `Здравствуйте, ${client}! Возвращаюсь к заявке «${title}». Готов ответить на вопросы и согласовать следующий шаг.`,
  proposal: (client, title) => `Здравствуйте, ${client}! Направляю предложение по заявке «${title}». Буду рад обсудить условия и ответить на вопросы.`,
  won: (client, title) => `Здравствуйте, ${client}! Спасибо за доверие по заявке «${title}». Подтверждаем дальнейшие шаги и остаёмся на связи.`,
  lost: (client, title) => `Здравствуйте, ${client}! Спасибо за обратную связь по заявке «${title}». Будем рады помочь, когда задача снова станет актуальной.`,
};
export const templateStageLabels: Record<TemplateStage, string> = { new: "Первый контакт", contacted: "Повторный контакт", proposal: "Предложение", won: "После сделки", lost: "Закрытие" };
export function inquiryMessageTemplate({ clientName, inquiryTitle, nextContactOn, stage = "new" }: { clientName: string; inquiryTitle: string; nextContactOn: string | null; stage?: TemplateStage }) {
  const deadline = nextContactOn && stage !== "won" && stage !== "lost" ? ` Следующий контакт: ${new Date(`${nextContactOn}T00:00:00Z`).toLocaleDateString("ru-RU")}.` : "";
  return `${stageCopy[stage](clientName, inquiryTitle)}${deadline}`;
}
export function inquiryEmailSubject(inquiryTitle: string) { return `По заявке «${inquiryTitle}»`; }
