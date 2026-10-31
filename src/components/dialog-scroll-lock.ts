// Reference counting also handles a gallery inside quick view being unmounted
// together on navigation: parent and child effect cleanup order is irrelevant.
let count = 0;
let originalOverflow = '';
export function lockBodyScroll() {
  if (count++ === 0) originalOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--count === 0) document.body.style.overflow = originalOverflow;
  };
}
