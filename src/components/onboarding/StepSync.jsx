import { CheckCircle2, FolderOpen, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { StepHeading } from '@/components/onboarding/StepHeading';
import { hasLibrary } from '@/lib/onboardingRules';

const primaryButton = 'inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50';
const outlineButton = 'inline-flex items-center gap-2 rounded-full border-[1.5px] border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary disabled:opacity-50';

// Phones and a few browsers can't pick a whole folder — they get the escape link only.
const folderPickerSupported = 'webkitdirectory' in document.createElement('input');

export const StepSync = ({ state, session, actions }) => {
  const [status, setStatus] = useState('');
  const [scanning, setScanning] = useState(false);
  const [linkedCount, setLinkedCount] = useState(null);
  const linked = hasLibrary(state, session);
  const skipped = state.onboarding.noLocalLibrary && !linked;
  const matching = state.libraryMatchRunning;
  // This scan, else what's on this device, else the count saved from another one.
  const trackCount = linkedCount ?? (state.ownedTracks.length || Number(session?.user?.user_metadata?.library_track_count) || 0);

  const linkFolder = async () => {
    setScanning(true);
    setStatus('Choose your music folder. Everything is read on your device.');
    try {
      const result = await actions.linkLibrary((done, total) => setStatus(total ? `Reading your tracks… ${done} / ${total}` : `Collecting files… ${done || ''}`));
      if (!result) { setStatus(''); return; }
      setLinkedCount(result.count);
      setStatus('');
      actions.updateOnboarding({ noLocalLibrary: false });
      // Starts matching straight away, in the background — it keeps going
      // (and resumes on its own) while the person finishes the last cards.
      actions.matchLibraryWithDiscogs()?.catch?.(() => {});
    } catch (error) {
      setStatus(error.message);
    } finally {
      setScanning(false);
    }
  };

  const connectDiscogs = async () => {
    try { await actions.connectDiscogs(); } catch (error) { setStatus(`Discogs connection failed: ${error.message}`); }
  };

  return (
    <>
      <StepHeading
        eyebrow="Sync"
        title="Sync your music library & Discogs"
        subtitle="This is how WaxTree learns what you already own. It lets us tag it while you dig and spend your time on music that's new to you."
      />

      <section className="rounded-2xl border border-border bg-white p-4">
        <div className="mb-1 flex items-center gap-2">
          <FolderOpen className="size-4 text-primary" aria-hidden="true" />
          <strong className="text-sm text-foreground">Your local music folder</strong>
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">Required</span>
        </div>
        <p className="text-[13px] leading-5 text-muted-foreground">
          Your files are read right here in your browser — they never leave your computer. WaxTree only keeps track titles and artists.
        </p>

        {linked && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-primary/10 p-3 text-[13px] leading-5 text-foreground">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <strong className="block">{trackCount.toLocaleString()} tracks linked — all good.</strong>
              <span className="text-muted-foreground">
                {matching
                  ? `WaxTree is matching your library with online releases (${state.libraryMatchProgress.done} / ${state.libraryMatchProgress.total} artists checked). This keeps running in the background, even if you carry on. `
                  : 'WaxTree matches your library with online releases in the background. '}
                We'll remind you to rescan every 14 days, and you can rescan any time from Settings.
              </span>
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {folderPickerSupported ? (
            <button type="button" onClick={linkFolder} disabled={scanning} className={linked ? outlineButton : primaryButton}>
              {scanning ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <FolderOpen className="size-4" aria-hidden="true" />}
              {linked ? 'Rescan folder' : 'Link my music folder'}
            </button>
          ) : (
            <p className="text-[13px] text-destructive">Folder scanning needs a desktop browser (Chrome, Edge, Safari or Firefox).</p>
          )}
          {status && <span className="text-xs text-muted-foreground" role="status">{status}</span>}
        </div>

        {!linked && (
          <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
            {skipped ? (
              <>
                Noted — you can link a folder any time from Settings.{' '}
                <button type="button" onClick={() => actions.updateOnboarding({ noLocalLibrary: false })} className="font-semibold text-primary underline underline-offset-2">Undo</button>
              </>
            ) : (
              <>
                No music files on this device?{' '}
                <button type="button" onClick={() => actions.updateOnboarding({ noLocalLibrary: true })} className="font-semibold text-primary underline underline-offset-2">I don't have a local music library</button>
              </>
            )}
          </div>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-white p-4">
        <div className="mb-1 flex items-center gap-2">
          <strong className="text-sm text-foreground">Your Discogs account</strong>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">Optional</span>
        </div>
        <p className="text-[13px] leading-5 text-muted-foreground">Bring in your collection and wantlist so WaxTree knows your vinyl too.</p>
        {state.discogsUser ? (
          <p className="mt-3 flex items-center gap-2 text-[13px] text-foreground">
            <CheckCircle2 className="size-4 text-primary" aria-hidden="true" /> Connected as <strong>@{state.discogsUser}</strong>
          </p>
        ) : (
          <button type="button" onClick={connectDiscogs} className={`${outlineButton} mt-3`}>Connect Discogs</button>
        )}
      </section>
    </>
  );
};
