import { describe, expect, it } from "vitest";
import { inquiryMessageTemplate, templateStageLabels } from "../../src/lib/cloud/message-templates";
describe("status templates", () => { it("uses distinct copy for proposal", () => expect(inquiryMessageTemplate({ clientName:"Анна", inquiryTitle:"Сайт", nextContactOn:null, stage:"proposal" })).toContain("предложение")); it("has all selectable stages", () => expect(Object.keys(templateStageLabels)).toHaveLength(5)); });
