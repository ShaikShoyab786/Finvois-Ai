// @types/pdf-parse only declares the package root, but we import the internal
// module ("pdf-parse/lib/pdf-parse.js") to avoid pdf-parse@1.1.1 reading a test
// file at startup. Re-map the subpath to the existing root types.
declare module "pdf-parse/lib/pdf-parse.js" {
  import pdfParse from "pdf-parse";
  export default pdfParse;
}
