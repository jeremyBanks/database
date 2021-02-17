export default class Context {
  private constructor(private label: string) {}

  static readonly TODO = new Context("TODO");

  public toString() {
    return this.label;
  }
}
