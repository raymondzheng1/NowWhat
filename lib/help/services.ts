import type { HelpService } from "@/lib/schemas/corpus";

/**
 * Curated standing Victorian help directory for the general /help page (tiered).
 * Tier 1 = free government / tribunal; Tier 2 = free legal services. Tier 3 (private
 * lawyers) is handled by LawyerSearch (LIV referral + a live search), not listed here.
 * Links are real organisation URLs.
 */
export interface DirectoryService extends HelpService {
  tier: "government" | "legal";
  /** Which government's decisions this service helps with. "both" shows in either view. */
  jurisdiction: "Cth" | "Vic" | "both";
}

export const VIC_HELP_DIRECTORY: DirectoryService[] = [
  // Tier 1 — free government / tribunal
  {
    service: "VCAT",
    who: "the Victorian Civil and Administrative Tribunal — reviews many government decisions and renting disputes",
    link: "https://www.vcat.vic.gov.au",
    tier: "government",
    jurisdiction: "Vic",
  },
  {
    service: "Victorian Ombudsman",
    who: "free complaints about Victorian government bodies (cannot overturn a decision)",
    link: "https://www.ombudsman.vic.gov.au",
    tier: "government",
    jurisdiction: "Vic",
  },
  {
    service: "Fines Victoria",
    who: "manage, review or get help with a Victorian fine",
    phone: "(03) 9200 8111",
    link: "https://online.fines.vic.gov.au",
    tier: "government",
    jurisdiction: "Vic",
  },
  {
    service: "Housing Appeals Office",
    who: "free, independent reviews of public-housing decisions",
    phone: "1800 807 702",
    link: "https://www.housing.vic.gov.au/appeal-decision",
    tier: "government",
    jurisdiction: "Vic",
  },
  // Tier 2 — free legal services
  {
    service: "Victoria Legal Aid",
    who: "free legal information and advice — Legal Help line",
    phone: "1300 792 387",
    link: "https://www.legalaid.vic.gov.au",
    tier: "legal",
    jurisdiction: "Vic",
  },
  {
    service: "Community legal centres",
    who: "free local legal help — find your nearest centre",
    link: "https://www.fclc.org.au",
    tier: "legal",
    jurisdiction: "Vic",
  },
  {
    service: "Tenants Victoria",
    who: "free advice for renters — Rental Support Line",
    phone: "(03) 9416 2577",
    link: "https://tenantsvic.org.au",
    tier: "legal",
    jurisdiction: "Vic",
  },
  {
    service: "Justice Connect — Homeless Law",
    who: "free legal help for people at risk of homelessness",
    phone: "1800 606 313",
    link: "https://justiceconnect.org.au/our-services/homeless-law/",
    tier: "legal",
    jurisdiction: "Vic",
  },
  {
    service: "Victorian Aboriginal Legal Service",
    who: "free legal help for Aboriginal and Torres Strait Islander people",
    phone: "1800 064 865",
    link: "https://www.vals.org.au",
    tier: "legal",
    jurisdiction: "Vic",
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

/**
 * Commonwealth services.
 *
 * A Centrelink decision is a federal matter, and the directory used to answer it with
 * VCAT, Fines Victoria and Tenants Victoria — useless to someone in Queensland, and
 * misleading to someone in Melbourne. These are the national equivalents.
 */
export const CTH_HELP_DIRECTORY: DirectoryService[] = [
  {
    service: "Administrative Review Tribunal (ART)",
    who: "independent external review of Australian Government decisions",
    link: "https://www.art.gov.au",
    tier: "government",
    jurisdiction: "Cth",
  },
  {
    service: "Commonwealth Ombudsman",
    who: "free complaints about Australian Government bodies (cannot overturn a decision)",
    link: "https://www.ombudsman.gov.au",
    tier: "government",
    jurisdiction: "Cth",
  },
  {
    service: "Services Australia — reviews and appeals",
    who: "ask for a Centrelink, Medicare or child support decision to be reviewed",
    link: "https://www.servicesaustralia.gov.au/reviews-and-appeals",
    tier: "government",
    jurisdiction: "Cth",
  },
  {
    service: "Economic Justice Australia (welfare rights centres)",
    who: "free, independent help with Centrelink decisions and debts — find your centre",
    link: "https://www.ejaustralia.org.au/legal-help-centrelink/",
    tier: "legal",
    jurisdiction: "Cth",
  },
  {
    service: "National Debt Helpline",
    who: "free, independent financial counselling",
    phone: "1800 007 007",
    link: "https://ndh.org.au",
    tier: "legal",
    jurisdiction: "Cth",
  },
  {
    service: "Legal aid in your state or territory",
    who: "free legal information and advice, wherever you live",
    link: "https://www.nationallegalaid.org",
    tier: "legal",
    jurisdiction: "both",
  },
];

export const HELP_DIRECTORY: DirectoryService[] = [...CTH_HELP_DIRECTORY, ...VIC_HELP_DIRECTORY];

/**
 * Services for one tier, optionally narrowed to a jurisdiction. Entries marked "both"
 * always appear — a national legal-aid finder is right for everyone.
 */
export function directoryByTier(
  tier: DirectoryService["tier"],
  jurisdiction?: "Cth" | "Vic",
): HelpService[] {
  return HELP_DIRECTORY.filter(
    (s) =>
      s.tier === tier &&
      (!jurisdiction || s.jurisdiction === jurisdiction || s.jurisdiction === "both"),
  )
    // The service for THIS government leads; the national fallbacks ("both") come after,
    // otherwise a Victorian reader is offered a national finder ahead of Victoria Legal Aid.
    .sort((a, b) => Number(a.jurisdiction === "both") - Number(b.jurisdiction === "both"))
    .map(({ service, who, link, phone }) => ({ service, who, link, phone }));
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
