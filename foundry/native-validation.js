// Use the installed system's real document classes, including its DataModels.
// Temporary documents are constructed in memory and are never created/saved.
export function validateNativeDocument(document) {
  if (document.validate({strict:true}) === false) throw new Error('Falha de validação do documento.');
}
export function validateNativeActor(data) {
  const candidate = new CONFIG.Actor.documentClass(data, {strict:true});
  validateNativeDocument(candidate);
}
export async function verifyNativeSheet(actor) {
  validateNativeDocument(actor);
  const sheet = actor.sheet;
  if (!sheet?.getData) throw new Error('O sistema não disponibilizou a ficha nativa deste ator.');
  const context = await sheet.getData();
  if (sheet.template) await foundry.applications.handlebars.renderTemplate(sheet.template, context);
}
