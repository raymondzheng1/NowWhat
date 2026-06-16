import type { HelpService } from "@/lib/schemas/corpus";

/**
 * Curated standing Victorian help directory for the general /help page (tiered).
 * Tier 1 = free government / tribunal; Tier 2 = free legal services. Tier 3 (private
 * lawyers) is handled by LawyerSearch (LIV referral + a live search), not listed here.
 * Links are real organisation URLs.
 */
export interface DirectoryService extends HelpService {
  tier: "government" | "legal";
}

export const VIC_HELP_DIRECTORY: DirectoryService[] = [
  // Tier 1 — free government / tribunal
  {
    service: "VCAT",
    who: "the Victorian Civil and Administrative Tribunal — reviews many government decisions and renting disputes",
    link: "https://www.vcat.vic.gov.au",
    tier: "government",
  },
  {
    service: "Victorian Ombudsman",
    who: "free complaints about Victorian government bodies (cannot overturn a decision)",
    link: "https://www.ombudsman.vic.gov.au",
    tier: "government",
  },
  {
    service: "Fines Victoria",
    who: "manage, review or get help with a Victorian fine — (03) 9200 8111",
    link: "https://online.fines.vic.gov.au",
    tier: "government",
  },
  {
    service: "Housing Appeals Office",
    who: "free, independent reviews of public-housing decisions — 1800 807 702",
    link: "https://www.housing.vic.gov.au/appeal-decision",
    tier: "government",
  },
  // Tier 2 — free legal services
  {
    service: "Victoria Legal Aid",
    who: "free legal information and advice — Legal Help line 1300 792 387",
    link: "https://www.legalaid.vic.gov.au",
    tier: "legal",
  },
  {
    service: "Community legal centres",
    who: "free local legal help — find your nearest centre",
    link: "https://www.fclc.org.au",
    tier: "legal",
  },
  {
    service: "Tenants Victoria",
    who: "free advice for renters — Rental Support Line (03) 9416 2577",
    link: "https://tenantsvic.org.au",
    tier: "legal",
  },
  {
    service: "Justice Connect — Homeless Law",
    who: "free legal help for people at risk of homelessness — 1800 606 313",
    link: "https://justiceconnect.org.au/our-services/homeless-law/",
    tier: "legal",
  },
  {
    service: "Victorian Aboriginal Legal Service",
    who: "free legal help for Aboriginal and Torres Strait Islander people — 1800 064 865",
    link: "https://www.vals.org.au",
    tier: "legal",
  },
];

/**
 * Classify a matter's help service into Tier 1 (free government / tribunal) or Tier 2
 * (free legal service) for the result's tiered "get help" display. Keyword-based on the
 * organisation name; defaults to legal (the safer "talk to a free lawyer" tier).
 */
const GOVERNMENT_HINTS = [
  "vcat",
  "tribunal",
  "ombudsman",
  "fines victoria",
  "housing appeals",
  "rental dispute",
  "rdrv",
  "consumer affairs",
  "services australia",
  "magistrates",
];

export function classifyHelpTier(service: HelpService): "government" | "legal" {
  const hay = `${service.service} ${service.who}`.toLowerCase();
  return GOVERNMENT_HINTS.some((h) => hay.includes(h)) ? "government" : "legal";
}

export function directoryByTier(tier: DirectoryService["tier"]): HelpService[] {
  return VIC_HELP_DIRECTORY.filter((s) => s.tier === tier).map(({ service, who, link }) => ({
    service,
    who,
    link,
  }));
}

// --- Tier 3: private-lawyer search (LIV referral + live Google search; no API key) ---

const LAWYER_TERMS: Record<string, string> = {
  "vic-renting": "residential tenancy renting",
  "vic-fines": "fines and infringements",
  "vic-public-housing": "public housing tenancy",
  "vic-generic": "administrative law government decisions",
};

export function lawyerTermForEntry(id: string, title: string): string {
  return LAWYER_TERMS[id] ?? title;
}

/** The Law Institute of Victoria — the proper referral channel for private lawyers. */
export const LIV_URL = "https://www.liv.asn.au";

/** A live Google search tailored to the matter (the "dynamic" lawyer lookup). */
export function lawyerSearchUrl(term: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${term} lawyer Victoria`)}`;
}
