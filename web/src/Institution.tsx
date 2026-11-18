import { useEffect, useRef, useState, type ReactNode } from 'react'
import information from './sau-information.json'
import manifest from '../public/assets/sau/manifest.json'
import { Icon } from './ui'

export const university = information
export const photographs = manifest.assets

export function UniversityBrand() {
  return (
    <>
      <span className="sau-mark" aria-hidden="true">
        <b>SAU</b>
        <i>2007</i>
      </span>
      <span className="university-wordmark">
        South Asian
        <br />
        University<small>ALUMNI NETWORK</small>
      </span>
    </>
  )
}

export function CampusImage({
  id = 'campus',
  className = '',
  priority = false,
}: {
  id?: string
  className?: string
  priority?: boolean
}) {
  const photo = photographs.find((item) => item.id === id)!
  const largest = photo.variants[photo.variants.length - 1]
  return (
    <img
      className={'campus-image ' + className}
      src={largest.src}
      srcSet={photo.variants
        .map((variant) => variant.src + ' ' + variant.width + 'w')
        .join(', ')}
      sizes="(max-width: 760px) 100vw, (max-width: 1200px) 65vw, 900px"
      alt={photo.description}
      width={largest.width}
      height={largest.height}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
    />
  )
}

export function PhotoCredit({ id = 'campus' }: { id?: string }) {
  const photo = photographs.find((item) => item.id === id)!
  return (
    <span className="photo-credit">
      {photo.year} · {photo.author} ·{' '}
      <a href={photo.sourcePage} target="_blank" rel="noreferrer">
        {photo.license}
      </a>
    </span>
  )
}

export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  )
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.showModal?.()
    return () => {
      document.body.style.overflow = previousOverflow
      previous?.focus()
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="dialog-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <Icon name="Close" />
        </button>
      </div>
      {children}
    </dialog>
  )
}

export function PhotoGallery() {
  const [filter, setFilter] = useState('All photographs')
  const [selected, setSelected] = useState<string | null>(null)
  const photo = photographs.find((item) => item.id === selected)
  const filtered = photographs.filter(
    (item) =>
      filter === 'All photographs' ||
      (filter === 'Campus'
        ? item.id === 'campus'
        : filter === 'Community'
          ? item.id === 'community'
          : ['library', 'campus-plan'].includes(item.id)),
  )
  return (
    <>
      <PageHeading
        eyebrow="A SHARED HISTORY"
        title="Campus & community"
        description="Places we remember. Moments that bring us together."
      />
      <div className="filters tab-filters">
        {['All photographs', 'Campus', 'Community', 'Archive'].map((label) => (
          <button
            key={label}
            aria-pressed={filter === label}
            onClick={() => setFilter(label)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="gallery-grid">
        {filtered.map((item) => (
          <article
            className={
              'gallery-card ' + (item.id === 'campus' ? 'gallery-wide' : '')
            }
            key={item.id}
          >
            <button
              className="gallery-photo"
              aria-label={'View ' + item.title}
              onClick={() => setSelected(item.id)}
            >
              <CampusImage id={item.id} />
              <span>
                <Icon name="Gallery" />
                View photograph
              </span>
            </button>
            <div className="gallery-caption">
              <small>
                {item.category.replace('-', ' ')} · {item.year}
              </small>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <PhotoCredit id={item.id} />
            </div>
          </article>
        ))}
      </div>
      <div className="source-note">
        This collection includes historical photographs and a labeled
        architectural concept. Images are resized WebP derivatives under their
        source licenses.
      </div>
      {photo && (
        <Modal title={photo.title} onClose={() => setSelected(null)}>
          <CampusImage id={photo.id} />
          <div className="dialog-copy">
            <p>{photo.description}</p>
            <PhotoCredit id={photo.id} />
            <p className="license-note">
              Resized and converted to WebP. Display crops vary.{' '}
              <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
                {photo.license} license
              </a>
              .
            </p>
          </div>
        </Modal>
      )}
    </>
  )
}

export function UniversityPage() {
  return (
    <>
      <PageHeading
        eyebrow="KNOW YOUR UNIVERSITY"
        title="Rooted in South Asia. Open to the world."
        description={university.mission.text}
      />
      <figure className="university-banner">
        <CampusImage priority />
        <figcaption>
          Maidan Garhi, New Delhi <PhotoCredit />
        </figcaption>
      </figure>
      <section className="history-grid">
        {university.facts.map((fact) => (
          <article key={fact.label}>
            <span className="editorial-number">{fact.label}</span>
            <p>{fact.text}</p>
            <a
              className="resource-link"
              href={fact.source}
              target="_blank"
              rel="noreferrer"
            >
              University source <Icon name="Arrow" />
            </a>
          </article>
        ))}
      </section>
      <div className="university-layout">
        <section className="panel section-panel">
          <span className="eyebrow">LEARNING ACROSS DISCIPLINES</span>
          <h2>Ideas without borders</h2>
          <p>Explore the academic community behind our alumni network.</p>
          <div className="academic-tags">
            {university.academics.fields.map((field) => (
              <span key={field}>{field}</span>
            ))}
          </div>
          <p className="source-note">
            <a
              href={university.academics.source}
              target="_blank"
              rel="noreferrer"
            >
              View faculties and departments at SAU
            </a>
          </p>
          <h3>Academic programmes</h3>
          <p>{university.academics.programmeExamples.join(' · ')}</p>
          <a
            className="resource-link"
            href="https://admissions.sau.int/"
            target="_blank"
            rel="noreferrer"
          >
            Explore current programmes <Icon name="Arrow" />
          </a>
        </section>
        <section className="panel section-panel">
          <span className="eyebrow">ONE UNIVERSITY, A SHARED REGION</span>
          <h2>Our founding nations</h2>
          <div className="country-grid">
            {university.countries.map((country) => (
              <span key={country}>{country}</span>
            ))}
          </div>
          <a
            className="resource-link"
            href="https://sau.int/about/"
            target="_blank"
            rel="noreferrer"
          >
            About South Asian University <Icon name="Arrow" />
          </a>
          <h3>Research at SAU</h3>
          <p>{university.research.initiatives.join(' · ')}</p>
          <a
            className="resource-link"
            href={university.research.source}
            target="_blank"
            rel="noreferrer"
          >
            Explore research <Icon name="Arrow" />
          </a>
        </section>
      </div>
      <ResourceCards />
    </>
  )
}

export function ResourceCards() {
  return (
    <section className="institution-resources">
      {university.resources.map((resource, index) => (
        <a
          key={resource.url}
          href={resource.url}
          target="_blank"
          rel="noreferrer"
        >
          <span className="icon-tile">
            <Icon
              name={
                ['University', 'Announcements', 'Careers', 'Gallery'][index]
              }
            />
          </span>
          <h3>{resource.title}</h3>
          <p>{resource.description}</p>
          <span className="resource-link">
            Visit SAU <Icon name="Arrow" />
          </span>
        </a>
      ))}
    </section>
  )
}

export function Credits() {
  return (
    <>
      <PageHeading
        title="Sources & image credits"
        description="The people and university resources behind this experience."
      />
      <section className="panel section-panel">
        <h2>University information</h2>
        <p>
          Institutional information is drawn from publicly available SAU
          sources, reviewed on {university.reviewedAt}.
        </p>
        <a
          className="resource-link"
          href="https://sau.int/"
          target="_blank"
          rel="noreferrer"
        >
          South Asian University <Icon name="Arrow" />
        </a>
      </section>
      <div className="credit-list">
        {photographs.map((photo) => (
          <article className="panel" key={photo.id}>
            <CampusImage id={photo.id} />
            <div>
              <h2>{photo.title}</h2>
              <p>{photo.description}</p>
              <p>
                {photo.author} · {photo.year}
              </p>
              <PhotoCredit id={photo.id} />
              <p className="license-note">
                {photo.modifications}{' '}
                <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
                  License terms
                </a>
              </p>
            </div>
          </article>
        ))}
      </div>
      <section className="panel section-panel">
        <h2>Typography</h2>
        <p>
          Inter and DM Serif Text are self-hosted under the SIL Open Font
          License. Read the <a href="/assets/fonts/inter-license.txt">Inter license</a>
          {' '}and <a href="/assets/fonts/dm-serif-text-license.txt">DM Serif Text license</a>.
        </p>
      </section>
    </>
  )
}

export function PortalFooter({
  navigate,
}: {
  navigate: (tab: string) => void
}) {
  return (
    <footer className="portal-footer">
      <span>
        South Asian University <span aria-hidden="true">·</span> Alumni network
        <br />
        <small>University information from sau.int</small>
      </span>
      <div>
        <a href="https://sau.int/contact/" target="_blank" rel="noreferrer">
          University contact
        </a>
        <button
          className="text-button"
          onClick={() => navigate('Sources & credits')}
        >
          Sources & image credits
        </button>
      </div>
    </footer>
  )
}
