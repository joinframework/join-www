(function () {
  const current = document.currentScript.dataset.version;
  const base = document.currentScript.dataset.base;

  const menu = document.querySelector(".version-menu");
  const banner = document.getElementById("version-banner");
  if (!menu && !banner) {
    return;
  }

  // main is served at the site root, each release in the directory named after its tag: /vX.Y.Z/
  function versionHome(version) {
    return version === "main" ? "/" : "/" + version + "/";
  }

  // the current page in another version
  function versionPage(version) {
    const path = location.pathname.startsWith(base) ? location.pathname.slice(base.length) : "";
    return versionHome(version) + path;
  }

  // open the current page in another version, or its home page if the page doesn't exist there
  function switchTo(event, version) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;  // new tab or window: let the browser follow the link
    }
    event.preventDefault();

    const page = versionPage(version);
    const home = versionHome(version);

    fetch(page, { method: "HEAD" })
      .then((response) => location.assign(response.ok ? page + location.hash : home))
      .catch(() => location.assign(home));
  }

  function versionLink(version, text) {
    const link = document.createElement("a");
    link.href = versionPage(version);
    link.textContent = text;
    link.addEventListener("click", (event) => switchTo(event, version));
    return link;
  }

  function showVersions(versions) {
    if (!versions.some((version) => version.version === current)) {
      versions = [{ version: current, title: current }, ...versions];
    }

    const list = document.getElementById("version-list");
    list.replaceChildren(...versions.map((version) => {
      const item = document.createElement("li");
      const link = versionLink(version.version, version.title);
      link.className = "flex flex-auto";
      link.classList.toggle("active", version.version === current);
      item.append(link);
      return item;
    }));
  }

  // warn on main and on old releases, with a link to the latest release
  function showBanner(versions) {
    const latest = versions.find((version) => (version.aliases || []).includes("latest"))
      || versions.find((version) => version.version !== "main");
    if (!latest || latest.version === current) {
      return;
    }

    if (current !== "main") {
      banner.textContent = "You are reading the documentation of " + current + ".";
      banner.classList.remove("hidden");
    }
    banner.append(" For the latest release, see ", versionLink(latest.version, latest.title), ".");
  }

  if (menu) {
    showVersions([]);
    menu.classList.remove("hidden");
  }

  // the list of versions is fetched at runtime, so that old releases also show the newer ones
  fetch("/versions.json", { cache: "no-cache" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(response.status + " " + response.statusText);
      }
      return response.json();
    })
    .then((versions) => {
      if (menu) {
        showVersions(versions);
      }
      if (banner) {
        showBanner(versions);
      }
    })
    .catch((error) => console.warn("versions.json: " + error.message));
})();
