// =========================================================
// PROTOTYPE — About v6 (the portrait + the voice)
// =========================================================
// Isolated script for prototype/about-v6.html. Not loaded by the
// live site.
//
// Unchanged in spirit from v5: motion applies ONLY to photographs
// (.photo-presence, the real site primitive), never to text. With
// only two photographs and four text beats on the whole page, there
// is even less here than in v5 for this script to do -- which is the
// point. The composition has to be convincing with this script
// removed entirely.

(function () {
  const photos = document.querySelectorAll('.photo-presence.reveal');
  photos.forEach(el => el.classList.add('pre'));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('pre');
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  photos.forEach(el => io.observe(el));

  // Safety net -- nothing should stay permanently hidden if
  // IntersectionObserver support is missing for some reason.
  setTimeout(() => {
    document.querySelectorAll('.pre').forEach(el => {
      el.classList.remove('pre');
      el.classList.add('in');
    });
  }, 4000);
})();
