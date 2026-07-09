import type { HrContractLegalTermsArticleSnapshot, HrContractPlaceholderContext } from "../../contract-type-foundation";
import { resolveContractPlaceholders } from "../../contract-type-foundation";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderArticleBody(
  article: HrContractLegalTermsArticleSnapshot,
  placeholderContext: HrContractPlaceholderContext,
  resolvePlaceholders: boolean,
): { bodyAr: string; bodyEn: string; titleAr: string; titleEn: string } {
  const titleEn = resolvePlaceholders ? resolveContractPlaceholders(article.title_en, placeholderContext) : article.title_en;
  const titleAr = article.title_ar
    ? resolvePlaceholders
      ? resolveContractPlaceholders(article.title_ar, placeholderContext)
      : article.title_ar
    : titleEn;
  const bodyEn = resolvePlaceholders ? resolveContractPlaceholders(article.body_en, placeholderContext) : article.body_en;
  const bodyAr = article.body_ar
    ? resolvePlaceholders
      ? resolveContractPlaceholders(article.body_ar, placeholderContext)
      : article.body_ar
    : bodyEn;
  return { bodyAr, bodyEn, titleAr, titleEn };
}

export function renderContractArticlesHtml(input: Readonly<{
  articles: readonly HrContractLegalTermsArticleSnapshot[];
  companyName: string;
  contractTypeCode: string;
  contractTypeName: string;
  generatedOn: string;
  placeholderContext: HrContractPlaceholderContext;
  resolvePlaceholders: boolean;
}>): string {
  const articleHtml = [...input.articles]
    .sort((left, right) => left.sequence - right.sequence)
    .map((article) => {
      const rendered = renderArticleBody(article, input.placeholderContext, input.resolvePlaceholders);
      return `
        <section class="contract-article">
          <h3>${escapeHtml(rendered.titleEn)}</h3>
          ${rendered.titleAr !== rendered.titleEn ? `<h4 dir="rtl">${escapeHtml(rendered.titleAr)}</h4>` : ""}
          <div class="article-body">${escapeHtml(rendered.bodyEn).replaceAll("\n", "<br />")}</div>
          ${rendered.bodyAr !== rendered.bodyEn ? `<div class="article-body" dir="rtl">${escapeHtml(rendered.bodyAr).replaceAll("\n", "<br />")}</div>` : ""}
        </section>
      `;
    })
    .join("");

  return `
    <article class="contract-preview">
      <header>
        <h1>Employment Contract</h1>
        <p class="muted">${escapeHtml(input.companyName)} · ${escapeHtml(input.contractTypeName)} (${escapeHtml(input.contractTypeCode)}) · v${escapeHtml(String(input.articles[0]?.version ?? "—"))}</p>
        <p class="muted">Generated ${escapeHtml(input.generatedOn)}</p>
      </header>
      ${articleHtml || "<p>No contract articles are defined.</p>"}
    </article>
  `;
}
