declare module 'long' {
  export = Long;
}

declare class Long {
  constructor(low: number, high?: number, unsigned?: boolean);
  static fromInt(value: number, unsigned?: boolean): Long;
  static fromNumber(value: number, unsigned?: boolean): Long;
  static fromString(str: string, unsigned?: boolean | number, radix?: number): Long;
  static fromBits(lowBits: number, highBits: number, unsigned?: boolean): Long;
  
  toNumber(): number;
  toString(radix?: number): string;
  
  static MAX_VALUE: Long;
  static MIN_VALUE: Long;
  static ZERO: Long;
  static ONE: Long;
  static NEG_ONE: Long;
}

declare global {
  type long = Long;
} 