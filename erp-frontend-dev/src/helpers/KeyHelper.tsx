

export class ReactKeyHelper {
  keyValue: number = 0;

  constructor(number?: any) {
      if (number) {
          this.keyValue = number;
      }
  }

  getNextKeyValue() {
      this.keyValue ++;
      return this.keyValue;
  }

  getCurrentKeyValue() {
      return this.keyValue;
  }
}
