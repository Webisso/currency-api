import { XMLParser, XMLValidator } from "fast-xml-parser";

export function validateTcmbXml(xmlContent) {
  const validationResult = XMLValidator.validate(xmlContent);

  if (validationResult !== true) {
    throw new Error(`Invalid XML received from TCMB: ${validationResult.err.msg}`);
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
  });

  const parsed = parser.parse(xmlContent);
  const root = parsed?.Tarih_Date;

  if (!root) {
    throw new Error("TCMB XML is missing Tarih_Date root element.");
  }

  if (!root["@_Tarih"]) {
    throw new Error("TCMB XML is missing Tarih attribute in Tarih_Date.");
  }

  if (!root.Currency) {
    throw new Error("TCMB XML is missing Currency entries.");
  }

  return parsed;
}
