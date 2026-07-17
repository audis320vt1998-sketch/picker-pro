import type { OcrPage, OcrWord } from '../../lib/document-intake'

function word(text: string, x: number, y: number, confidence = 88): OcrWord {
  return {
    text,
    confidence,
    boundingBox: { x0: x, y0: y, x1: x + 42, y1: y + 34 },
  }
}

/**
 * Redacted geometry representative of a supplied 2880 by 3840 close-up.
 * Text is synthetic; only the table coordinate pattern, wrapped names, mild
 * perspective drift, and distracting numeric/header positions are retained.
 */
export const maayanCloseupRedactedOcrPage: OcrPage = {
  width: 2880,
  height: 3840,
  words: [
    word('document-header', 1600, 760),
    word('0540000000', 2110, 780),
    word('4760000', 2490, 790),

    word('1', 2714, 930),
    word('92100', 2470, 932),
    word('7290020531991', 2050, 931),
    word('Frozen', 1740, 934),
    word('Vanilla', 1560, 936),
    word('1.00', 820, 932),
    word('10.00', 640, 933),
    word('10.00', 450, 934),
    word('12.23', 120, 934),
    word('1/10', 1610, 978),

    word('2', 2702, 1050),
    word('92101', 2458, 1052),
    word('07290020539991', 2032, 1051),
    word('Frozen', 1710, 1053),
    word('Chocolate', 1490, 1055),
    word('2.00', 802, 1052),
    word('10.00', 622, 1053),
    word('20.00', 432, 1054),
    word('12.23', 112, 1054),
    word('1/10', 1590, 1095),

    word('99999', 2450, 1118),
    word('1234567890123', 2020, 1118),
    word('header-like', 1620, 1118),

    word('3', 2692, 1170),
    word('88107', 2448, 1172),
    word('8437020396158', 2022, 1171),
    word('Fruit', 1700, 1174),
    word('Bar', 1550, 1176),
    word('1.00', 792, 1172),
    word('12.00', 612, 1173),
    word('12.00', 422, 1174),
    word('19.50', 102, 1174),
    word('1/12', 1570, 1215),
  ],
}
