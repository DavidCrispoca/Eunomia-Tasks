import { format } from "date-fns";
import { es as localeEs, enUS as localeEn } from "date-fns/locale";
import type { Language } from "@/types";
import { parseISODate } from "@/lib/utils";

const DAY_NAMES: Record<Language, string[]> = {
  es: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};

const FULL_DAY_NAMES: Record<Language, string[]> = {
  es: [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
  ],
  en: [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ],
};

const MONTH_NAMES: Record<Language, string[]> = {
  es: [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ],
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
};

export function dayShort(index: number, lang: Language) {
  return DAY_NAMES[lang][index];
}

export function dayFull(index: number, lang: Language) {
  return FULL_DAY_NAMES[lang][index];
}

export function monthFull(index: number, lang: Language) {
  return MONTH_NAMES[lang][index];
}

export function formatShortDate(isoDate: string, lang: Language) {
  return format(parseISODate(isoDate), "d MMM", {
    locale: lang === "es" ? localeEs : localeEn,
  });
}

export function weekdayOf(isoDate: string) {
  const d = parseISODate(isoDate);
  return (d.getDay() + 6) % 7;
}

export function startOfWeek(isoDate: string) {
  const d = parseISODate(isoDate);
  const offset = weekdayOf(isoDate);
  d.setDate(d.getDate() - offset);
  return d;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}