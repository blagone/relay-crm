import { describe, expect, it } from "vitest";
import { canTransition, inquirySchema, metrics } from "../../src/lib/domain";
import { loadDemo, saveDemo, seed } from "../../src/lib/demo";

describe("domain rules",()=>{
 it("allows only documented status transitions",()=>{expect(canTransition("new","contacted")).toBe(true);expect(canTransition("new","won")).toBe(false);expect(canTransition("won","contacted")).toBe(true)});
 it("rejects invalid dates and amounts",()=>{expect(inquirySchema.safeParse({...seed.inquiries[0],nextContactOn:"2026-99-99"}).success).toBe(false);expect(inquirySchema.safeParse({...seed.inquiries[0],amountMinor:-1}).success).toBe(false)});
 it("excludes archived inquiries from metrics",()=>{const result=metrics(seed);expect(result.active).toBe(2);expect(result.pipeline).toBe(50_500_000);expect(result.won).toBe(14_500_000)});
});
describe("demo storage",()=>{
 it("loads validated state",()=>{expect(loadDemo({getItem:()=>JSON.stringify(seed)}).state).toEqual(seed)});
 it("recovers from malformed data",()=>{const result=loadDemo({getItem:()=>"{"});expect(result.warning).toBeTruthy();expect(result.state).toEqual(seed)});
 it("reports denied writes",()=>{expect(saveDemo({setItem:()=>{throw new Error("quota")}},seed)).toBeTruthy()});
});
