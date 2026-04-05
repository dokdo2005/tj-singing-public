const RELEASE_SOURCE = {
  owner: "dokdo2005",
  repo: "tj-singing-public",
};

const apiUrl = `https://api.github.com/repos/${RELEASE_SOURCE.owner}/${RELEASE_SOURCE.repo}/releases?per_page=20`;
const repoUrl = `https://github.com/${RELEASE_SOURCE.owner}/${RELEASE_SOURCE.repo}`;

const statusElement = document.getElementById("status");
const releaseListElement = document.getElementById("release-list");
const releaseCountElement = document.getElementById("release-count");
const updatedAtElement = document.getElementById("updated-at");
const repoNameElement = document.getElementById("repo-name");

if (repoNameElement) {
  repoNameElement.textContent = `${RELEASE_SOURCE.owner}/${RELEASE_SOURCE.repo}`;
}

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "long",
  timeStyle: "short",
});

const compactDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
});

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "크기 정보 없음";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const fractionDigits = size >= 100 || unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(fractionDigits)} ${units[unitIndex]}`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderReleaseCard(release, index) {
  const publishedAt = release.published_at
    ? compactDateFormatter.format(new Date(release.published_at))
    : "날짜 정보 없음";
  const releaseTitle = escapeHtml(release.name || release.tag_name || "이름 없는 릴리즈");
  const tagName = escapeHtml(release.tag_name || "태그 없음");
  const releaseUrl = release.html_url || `${repoUrl}/releases`;
  const isLatest = index === 0;

  const extraTags = [
    isLatest ? '<span class="tag">최신</span>' : "",
    release.prerelease ? '<span class="tag secondary">Pre-release</span>' : "",
  ]
    .filter(Boolean)
    .join("");

  const assetsMarkup = release.assets.length
    ? release.assets
        .map((asset) => {
          const assetName = escapeHtml(asset.name || "download");
          const assetSize = formatBytes(asset.size);
          const downloadCount = Number.isFinite(asset.download_count)
            ? `${asset.download_count.toLocaleString("ko-KR")}회 다운로드`
            : "다운로드 수 없음";

          return `
            <article class="asset-item">
              <div class="asset-info">
                <p class="asset-name">${assetName}</p>
                <div class="asset-meta">${assetSize} · ${downloadCount}</div>
              </div>
              <div class="asset-actions">
                <a class="button" href="${asset.browser_download_url}" download>다운로드</a>
                <a class="button secondary" href="${asset.browser_download_url}" target="_blank" rel="noreferrer">새 탭에서 열기</a>
              </div>
            </article>
          `;
        })
        .join("")
    : '<div class="empty">이 릴리즈에는 첨부된 파일이 없습니다.</div>';

  return `
    <article class="release-card${isLatest ? " latest" : ""}">
      <div class="release-header">
        <div class="release-heading">
          <h3>${releaseTitle}</h3>
          <div class="release-meta">
            <span>${publishedAt}</span>
            <span>${release.assets.length}개 파일</span>
          </div>
        </div>
        <div>${extraTags}<span class="tag secondary">${tagName}</span></div>
      </div>
      <a class="release-note-link" href="${releaseUrl}" target="_blank" rel="noreferrer">
        GitHub Release 페이지 보기
      </a>
      <div class="asset-list">${assetsMarkup}</div>
    </article>
  `;
}

async function loadReleases() {
  try {
    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    const releases = await response.json();

    if (!Array.isArray(releases) || releases.length === 0) {
      releaseCountElement.textContent = "릴리즈 없음";
      updatedAtElement.textContent = "표시할 릴리즈가 없습니다.";
      statusElement.className = "empty";
      statusElement.textContent = "아직 공개된 GitHub Release가 없습니다.";
      return;
    }

    const assetTotal = releases.reduce((sum, release) => sum + release.assets.length, 0);
    releaseCountElement.textContent = `${releases.length}개 릴리즈 · ${assetTotal}개 파일`;
    updatedAtElement.textContent = `마지막 확인: ${dateFormatter.format(new Date())}`;

    releaseListElement.innerHTML = releases.map(renderReleaseCard).join("");
    releaseListElement.hidden = false;
    statusElement.remove();
  } catch (error) {
    console.error(error);
    releaseCountElement.textContent = "불러오기 실패";
    updatedAtElement.textContent = "GitHub Releases를 가져오지 못했습니다.";
    statusElement.className = "empty";
    statusElement.innerHTML = `
      GitHub Releases 목록을 불러오지 못했습니다.<br />
      잠시 후 다시 시도하거나
      <a class="release-note-link" href="${repoUrl}/releases" target="_blank" rel="noreferrer">GitHub Releases 페이지</a>
      를 직접 열어 보세요.
    `;
  }
}

loadReleases();
