import { redirect } from "next/navigation";
import { ContactCalendar } from "@/components/cloud/contact-calendar";
import { calendarMonthBounds, currentCalendarDay, parseCalendarMonth } from "@/lib/cloud/calendar-input";
import { readContactCalendar } from "@/lib/server/calendar-queries";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const month = parseCalendarMonth(typeof params.month === "string" ? params.month : undefined);
  const bounds = calendarMonthBounds(month);
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/app");
  const data = await readContactCalendar(user.id, bounds.first, bounds.last);
  if (!data) redirect("/app");
  return <ContactCalendar data={data} month={month} today={currentCalendarDay()}/>;
}
