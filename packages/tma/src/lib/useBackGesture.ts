import { useEffect, useRef } from 'react';

/**
 * Registers a browser-level back gesture handler for "modal" UI states.
 *
 * When `active` becomes true, pushes a synthetic history entry (same URL).
 * Any of these will trigger the `onBack` callback:
 *   • iOS swipe-from-left-edge
 *   • Android system back gesture / back button
 *   • Telegram WebApp BackButton (if wired to window.history.back())
 *   • Calling window.history.back() from a UI element
 *
 * `onBack` should return true if it consumed the event (exiting the mode),
 * or false if it was cancelled (e.g., the user dismissed a confirm dialog).
 * When false is returned, the history entry is re-pushed so the next
 * swipe/back press will trigger onBack again.
 *
 * When `active` becomes false WITHOUT a gesture (e.g., save button pressed),
 * the dangling synthetic history entry is safely popped so it doesn't
 * pollute the history stack. Since the URL doesn't change, React Router
 * ignores this pop.
 */
export function useBackGesture(
    active: boolean,
    onBack: () => boolean,
) {
    // Keep onBack in a ref so re-renders don't need to re-register the listener
    const onBackRef = useRef(onBack);
    onBackRef.current = onBack;

    // Track whether we own a synthetic history entry right now
    const ownsPush = useRef(false);

    useEffect(() => {
        if (!active) return;

        // Push synthetic entry (same URL, React Router won't navigate)
        window.history.pushState({ __backGesture: true }, '');
        ownsPush.current = true;

        function registerListener() {
            window.addEventListener('popstate', handlePopstate, { once: true });
        }

        function handlePopstate() {
            ownsPush.current = false;
            const consumed = onBackRef.current();
            if (!consumed) {
                // User cancelled (e.g. confirm dialog) — re-push so next swipe works
                window.history.pushState({ __backGesture: true }, '');
                ownsPush.current = true;
                registerListener();
            }
        }

        registerListener();

        return () => {
            // Cleanup: remove listener first
            window.removeEventListener('popstate', handlePopstate);

            // If we still own a synthetic entry (active→false via button/save),
            // pop it. Since URL is the same, React Router ignores the popstate.
            if (ownsPush.current && window.history.state?.__backGesture) {
                ownsPush.current = false;
                window.history.back();
            }
        };
    }, [active]);
}
