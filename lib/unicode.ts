const BOLD_UPPER = "𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭";
const BOLD_LOWER = "𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇";
const BOLD_DIGITS = "𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵";

const ITALIC_UPPER = "𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡";
const ITALIC_LOWER = "𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻";

const BOLD_ITALIC_UPPER = "𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕";
const BOLD_ITALIC_LOWER = "𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯";

const NORMAL_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NORMAL_LOWER = "abcdefghijklmnopqrstuvwxyz";
const NORMAL_DIGITS = "0123456789";

function toArray(str: string): string[] {
  return [...str];
}

const boldUpperArr = toArray(BOLD_UPPER);
const boldLowerArr = toArray(BOLD_LOWER);
const boldDigitsArr = toArray(BOLD_DIGITS);
const italicUpperArr = toArray(ITALIC_UPPER);
const italicLowerArr = toArray(ITALIC_LOWER);
const boldItalicUpperArr = toArray(BOLD_ITALIC_UPPER);
const boldItalicLowerArr = toArray(BOLD_ITALIC_LOWER);

const allBoldChars = new Set([...boldUpperArr, ...boldLowerArr, ...boldDigitsArr]);
const allItalicChars = new Set([...italicUpperArr, ...italicLowerArr]);
const allBoldItalicChars = new Set([...boldItalicUpperArr, ...boldItalicLowerArr]);

function mapChar(
  char: string,
  upperFrom: string,
  lowerFrom: string,
  upperTo: string[],
  lowerTo: string[],
  digitsFrom?: string,
  digitsTo?: string[]
): string {
  const upperIdx = upperFrom.indexOf(char);
  if (upperIdx !== -1) return upperTo[upperIdx];

  const lowerIdx = lowerFrom.indexOf(char);
  if (lowerIdx !== -1) return lowerTo[lowerIdx];

  if (digitsFrom && digitsTo) {
    const digitIdx = digitsFrom.indexOf(char);
    if (digitIdx !== -1) return digitsTo[digitIdx];
  }

  return char;
}

function reverseMapChar(
  char: string,
  upperTo: string[],
  lowerTo: string[],
  upperFrom: string,
  lowerFrom: string,
  digitsTo?: string[],
  digitsFrom?: string
): string {
  const upperIdx = upperTo.indexOf(char);
  if (upperIdx !== -1) return upperFrom[upperIdx];

  const lowerIdx = lowerTo.indexOf(char);
  if (lowerIdx !== -1) return lowerFrom[lowerIdx];

  if (digitsTo && digitsFrom) {
    const digitIdx = digitsTo.indexOf(char);
    if (digitIdx !== -1) return digitsFrom[digitIdx];
  }

  return char;
}

function isCharBold(char: string): boolean {
  return allBoldChars.has(char) || allBoldItalicChars.has(char);
}

function isCharItalic(char: string): boolean {
  return allItalicChars.has(char) || allBoldItalicChars.has(char);
}

function toNormal(char: string): string {
  if (allBoldChars.has(char)) {
    return reverseMapChar(char, boldUpperArr, boldLowerArr, NORMAL_UPPER, NORMAL_LOWER, boldDigitsArr, NORMAL_DIGITS);
  }
  if (allItalicChars.has(char)) {
    return reverseMapChar(char, italicUpperArr, italicLowerArr, NORMAL_UPPER, NORMAL_LOWER);
  }
  if (allBoldItalicChars.has(char)) {
    return reverseMapChar(char, boldItalicUpperArr, boldItalicLowerArr, NORMAL_UPPER, NORMAL_LOWER);
  }
  return char;
}

export function toBold(text: string): string {
  const chars = toArray(text);
  return chars
    .map((char) => {
      if (allItalicChars.has(char)) {
        const normal = toNormal(char);
        return mapChar(normal, NORMAL_UPPER, NORMAL_LOWER, boldItalicUpperArr, boldItalicLowerArr);
      }
      if (allBoldItalicChars.has(char)) {
        return char;
      }
      if (allBoldChars.has(char)) {
        return char;
      }
      return mapChar(char, NORMAL_UPPER, NORMAL_LOWER, boldUpperArr, boldLowerArr, NORMAL_DIGITS, boldDigitsArr);
    })
    .join("");
}

export function toItalic(text: string): string {
  const chars = toArray(text);
  return chars
    .map((char) => {
      if (allBoldChars.has(char)) {
        const normal = toNormal(char);
        return mapChar(normal, NORMAL_UPPER, NORMAL_LOWER, boldItalicUpperArr, boldItalicLowerArr);
      }
      if (allBoldItalicChars.has(char)) {
        return char;
      }
      if (allItalicChars.has(char)) {
        return char;
      }
      return mapChar(char, NORMAL_UPPER, NORMAL_LOWER, italicUpperArr, italicLowerArr);
    })
    .join("");
}

export function removeBold(text: string): string {
  const chars = toArray(text);
  return chars
    .map((char) => {
      if (allBoldItalicChars.has(char)) {
        const normal = toNormal(char);
        return mapChar(normal, NORMAL_UPPER, NORMAL_LOWER, italicUpperArr, italicLowerArr);
      }
      if (allBoldChars.has(char)) {
        return toNormal(char);
      }
      return char;
    })
    .join("");
}

export function removeItalic(text: string): string {
  const chars = toArray(text);
  return chars
    .map((char) => {
      if (allBoldItalicChars.has(char)) {
        const normal = toNormal(char);
        return mapChar(normal, NORMAL_UPPER, NORMAL_LOWER, boldUpperArr, boldLowerArr, NORMAL_DIGITS, boldDigitsArr);
      }
      if (allItalicChars.has(char)) {
        return toNormal(char);
      }
      return char;
    })
    .join("");
}

export function isSelectionBold(text: string): boolean {
  const chars = toArray(text);
  const letterChars = chars.filter(
    (c) =>
      NORMAL_UPPER.includes(c) ||
      NORMAL_LOWER.includes(c) ||
      NORMAL_DIGITS.includes(c) ||
      allBoldChars.has(c) ||
      allItalicChars.has(c) ||
      allBoldItalicChars.has(c)
  );
  if (letterChars.length === 0) return false;
  return letterChars.every((c) => isCharBold(c));
}

export function isSelectionItalic(text: string): boolean {
  const chars = toArray(text);
  const letterChars = chars.filter(
    (c) =>
      NORMAL_UPPER.includes(c) ||
      NORMAL_LOWER.includes(c) ||
      allBoldChars.has(c) ||
      allItalicChars.has(c) ||
      allBoldItalicChars.has(c)
  );
  if (letterChars.length === 0) return false;
  return letterChars.every((c) => isCharItalic(c));
}
