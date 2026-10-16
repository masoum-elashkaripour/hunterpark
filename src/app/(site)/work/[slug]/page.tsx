import Link from "next/link";
import { notFound } from "next/navigation";
import { WORKS } from "@/lib/works";
import { RelatedCarousel } from "@/components/related-carousel";
import { ProjectFilm } from "@/components/project-film";
import { Reveal } from "@/components/reveal";
import { StillFooter } from "@/components/still-footer";

/**
 * Project page, after the reference (schemeengine.com/work/…): the film and its
 * credits fill the opening screen, then "More films" follows underneath — as a
 * horizontal rail here rather than the reference's stacked grid.
 */

export function generateStaticParams() {
  return WORKS.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const work = WORKS.find((w) => w.slug === slug);
  if (!work) return {};
  return { title: `${work.client} — ${work.title} | Hunterpark` };
}

export default async function WorkDetailPage({
  params,
}: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const work = WORKS.find((w) => w.slug === slug);
  if (!work) notFound();

  /* Same category first — that is the only real relatedness in the data — then
     the rest of the index, so the rail is always full even for a lone film. */
  const related = [
    ...WORKS.filter((w) => w.slug !== slug && w.category === work.category),
    ...WORKS.filter((w) => w.slug !== slug && w.category !== work.category),
  ].slice(0, 12);

  return (
    <main className="pt-header">
      {/* Everything but the film arrives after it, staggered. The delays are
          measured from the start of the navigation and all of them clear
          `--hp-morph-ms` (900ms), so the tile has finished becoming the film
          before any type moves. */}
      <Reveal delay={0.55} className="px-gutter pt-4 lg:pt-6">
        <Link
          href="/work"
          className="label-xs text-off-white/45 transition-colors duration-300 ease-hp-out hover:text-lime"
        >
          ← Index
        </Link>
      </Reveal>

      {/* Where the picture lands. `LaunchProvider` looks this box up after the
          route resolves and brings the full-screen still down onto it, so the
          film the reader clicked arrives in its place rather than cutting in.
          Deliberately NOT wrapped in `Reveal` — it is the thing that was
          already on screen, and animating it again would fight the settle. */}
      <div className="mt-4 px-gutter">
        {/* Full gutter-to-gutter, in line with every other section. A 16:9
            frame at this width is taller than what is left of a short
            viewport, so the foot of it can fall past the fold — that is the
            trade for keeping the film the width of the page. */}
        <div className="work-tile__frame" data-launch-target>
          <ProjectFilm
            video={work.video}
            poster={work.poster}
            label={`${work.client} — ${work.title}`}
          />
        </div>
      </div>

      <Reveal delay={0.68} className="mt-10 px-gutter lg:mt-14">
        <p className="hp-eyebrow">
          {work.category}
          <span className="mx-2 text-off-white/25">/</span>
          {work.year}
        </p>

        <h1 className="hp-display work-detail__title mt-3 text-h1">{work.client}</h1>
        <p className="hp-sub work-detail__sub mt-2 text-h4">{work.title}</p>

        {/* Credits block, as on the reference. The real crew is not in the data
            yet, so only what we actually know is printed. */}
        <dl className="mt-10 grid max-w-3xl grid-cols-[auto_1fr] gap-x-8 gap-y-3 border-t border-dark pt-6">
          <dt className="label-xs text-off-white/40">Client</dt>
          <dd className="hp-sub text-sm">{work.client}</dd>

          <dt className="label-xs text-off-white/40">Discipline</dt>
          <dd className="hp-sub text-sm">{work.category}</dd>

          <dt className="label-xs text-off-white/40">Year</dt>
          <dd className="hp-sub text-sm">{work.year}</dd>

          {work.note ? (
            <>
              <dt className="label-xs text-off-white/40">Note</dt>
              <dd className="hp-sub text-sm">{work.note}</dd>
            </>
          ) : null}
        </dl>
      </Reveal>

      <Reveal delay={0.88}>
        <RelatedCarousel works={related} />
      </Reveal>

      {/* The page ends the way /contact does: the still footer, fading up. */}
      <StillFooter />
    </main>
  );
}
