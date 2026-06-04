import type { SyntheticEvent } from 'react'
import { Reveal } from '../Reveal'
import { team, githubAvatar, githubProfile } from '../../../config'

function hideBrokenAvatar(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = 'none'
}

export function Team() {
  return (
    <div className="sr-section__inner">
      <Reveal>
        <p className="sr-eyebrow">Who&apos;s building it</p>
      </Reveal>
      <Reveal delay={60}>
        <h2 className="sr-h2">The team</h2>
      </Reveal>
      <div className="sr-team">
        {team.map((m, i) => (
          <Reveal key={m.handle} delay={100 + i * 70}>
            <a className="sr-member" href={githubProfile(m.handle)} target="_blank" rel="noreferrer">
              <span className="sr-member__pic">
                <span className="sr-member__initials" aria-hidden="true">
                  {m.name.charAt(0)}
                </span>
                <img
                  className="sr-member__avatar"
                  src={githubAvatar(m.handle)}
                  alt={`${m.name} (@${m.handle})`}
                  loading="lazy"
                  width={72}
                  height={72}
                  onError={hideBrokenAvatar}
                />
              </span>
              <span className="sr-member__name">{m.name}</span>
              <span className="sr-member__handle">@{m.handle}</span>
              {m.role && <span className="sr-member__role">{m.role}</span>}
            </a>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
