// Site-wide constants. Kept in one place so the landing and editor stay in
// sync and the production URL is a single edit.

export const siteConfig = {
  hackathon: 'GitHub Copilot Hackathon 2026',
  product: 'Soul Review',
  tagline: 'A code reviewer with a soul — and a memory.',
  repoUrl: 'https://github.com/yizyace/github-copilot-hackathon-26',
  siteUrl: 'https://pattern-buddy.com',
} as const

export interface TeamMember {
  name: string
  handle: string
  role?: string
}

export const team: TeamMember[] = [
  { name: 'Andrew', handle: 'yizyace' },
  { name: 'Ben', handle: 'benjyi' },
  { name: 'Richard', handle: 'rlin25' },
  { name: 'Nghia', handle: 'N-star-dot' },
  { name: 'Dilasha', handle: 'P-dilasha-004' },
]

export const githubProfile = (handle: string) => `https://github.com/${handle}`
export const githubAvatar = (handle: string, size = 160) =>
  `https://github.com/${handle}.png?size=${size}`
