import { CHAR_NAMES, dominantPlace } from "@/components/game/CharacterSVGs";

export interface InputPanelDerived {
  isPos: boolean;
  isNeg: boolean;
  absVal: number;
  type: "ab" | "ku";
  cardBorder: string;
  iconBg: string;
  iconLabel: string;
  titleColor: string;
  troopName: string | null;
  subtitle: string;
  inputColor: string;
  inputBorder: string;
  svgBg: string;
}

export function inputPanelProps(val: number): InputPanelDerived {
  const isPos = val > 0;
  const isNeg = val < 0;
  const absVal = Math.abs(val);
  const type: "ab" | "ku" = val >= 0 ? "ab" : "ku";

  return {
    isPos,
    isNeg,
    absVal,
    type,
    cardBorder: isPos
      ? "border-intblue/25"
      : isNeg
        ? "border-intpink/25"
        : "border-border",
    iconBg: isPos ? "bg-intblue" : isNeg ? "bg-intpink" : "bg-slate-300",
    iconLabel: isPos ? "+" : isNeg ? "-" : "?",
    titleColor: isPos
      ? "text-intblue"
      : isNeg
        ? "text-intpink"
        : "text-slate-400",
    troopName:
      absVal > 0
        ? isPos
          ? CHAR_NAMES.ab[dominantPlace(absVal)]
          : CHAR_NAMES.ku[dominantPlace(absVal)]
        : null,
    subtitle:
      absVal > 0
        ? isPos
          ? `Antibodi +${absVal.toLocaleString("id-ID")}`
          : `Kuman -${absVal.toLocaleString("id-ID")}`
        : "-9.999 sampai +9.999",
    inputColor: isPos
      ? "text-intblue"
      : isNeg
        ? "text-intpink"
        : "text-slate-400",
    inputBorder: isPos
      ? "border-intblue/30 focus:border-intblue bg-intblue-light/30"
      : isNeg
        ? "border-intpink/30 focus:border-intpink bg-intpink-light/30"
        : "border-border bg-surface",
    svgBg: isPos
      ? "bg-intblue-light/40 border-intblue/10"
      : "bg-intpink-light/40 border-intpink/10",
  };
}
