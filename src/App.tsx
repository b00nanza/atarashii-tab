import { useEffect, useState } from "react"
import { FaHeart, FaReddit, FaSadTear, FaSync } from "react-icons/fa"
import { PuffLoader } from "react-spinners"

import Config from "./components/Config"
import Menu from "./components/Menu"
import Image from "./components/Image"
import { TimeDate } from "./components/TimeDate"

import pkg from "../package.json"

import { useSnapshot } from "valtio"
import "./App.scss"
import {
  AppStore,
  LoadState,
  setLoaded,
} from "./stores/AppStore"
import { CacheStore } from "./stores/CacheStore"
import { ConfigStore } from "./stores/ConfigStore"
import {
  HistoryStore,
  pushPostToHistory,
  type RedditPost,
} from "./stores/HistoryStore"
import { fetchPosts } from "./utils/fetchPosts"
import MenuButton from "./components/MenuButton"

function App() {
  const { loaded, showRollOverlay } = useSnapshot(AppStore)
  const config = useSnapshot(ConfigStore)
  const cache = useSnapshot(CacheStore)
  const { history, i } = useSnapshot(HistoryStore)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--primary",
      config.theme.primary
    )

    document.documentElement.style.setProperty(
      "--background-dim",
      String(config.theme.backgroundDim)
    )
  }, [config.theme.primary, config.theme.backgroundDim])

  useEffect(() => {
    if (config.pinned && loaded === LoadState.FETCH_NEW) {
      setLoaded(LoadState.LOADING)
    }
  }, [config.pinned, loaded])

  useEffect(() => {
    // No-op if incognito or pinned
    if (config.incognito || config.pinned || loaded !== LoadState.FETCH_NEW)
      return

    let ignore = false

    async function run() {
      let posts: RedditPost[] = []

      // Cache for 24 hours
      try {
        if (
          cache.lastUpdated === -1 ||
          Date.now() - cache.lastUpdated >= 1000 * 60 * 60 * 24
        ) {
          console.log("[i] Fetching w/ config:", config)
          posts = await fetchPosts(config)

          if (!ignore) {
            CacheStore.lastUpdated = Date.now()
            CacheStore.data = posts
          }
        } else {
          console.log("[i] Using cached posts")
          posts = cache.data as RedditPost[]
        }
        if (!ignore) setFetchError(null)
      } catch (e) {
        console.error("[!] Failed to fetch posts:", e)
        if (!ignore) {
          setFetchError(e instanceof Error ? e.message : String(e))
          setLoaded(LoadState.LOADED)
        }
        return
      }

      if (!posts.length || ignore) {
        if (!ignore) setLoaded(LoadState.LOADED)
        return
      }

      const num = Math.floor(Math.random() * posts.length)
      const post = posts[num]

      console.log("[i] Loading post:", post)

      pushPostToHistory(post, num, posts.length)
      setLoaded(LoadState.LOADING)
    }

    run()

    return () => {
      ignore = true
    }
  }, [cache.data, cache.lastUpdated, config, loaded])

  const data =
    loaded !== LoadState.FETCH_NEW
      ? history.length
        ? history[i] || history[history.length - 1]
        : null
      : undefined

  return (
    <div className={showRollOverlay ? "roll-flashing" : ""}>
      {showRollOverlay && (
        <div className="roll-overlay" aria-label="Rolling wallpaper">
          <FaSync size={48} />
        </div>
      )}

      <div
        className={
          "app-frame " +
          (!config.incognito && loaded === LoadState.LOADED ? "load" : "") +
          " " +
          (config.hideGui ? "hidden" : "")
        }
      >
        <div className="content">
          {fetchError && (
            <div
              role="alert"
              style={{
                position: "absolute",
                top: "1rem",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 5,
                maxWidth: "80%",
                padding: "10px 16px",
                borderRadius: "12px",
                background: "rgba(0,0,0,.7)",
                color: "#fff",
                fontSize: ".85rem",
                textAlign: "center",
                lineHeight: 1.4,
              }}
            >
              {/\b(401|403)\b/.test(fetchError)
                ? `Reddit refused the request (${fetchError.match(/\b(401|403)\b/)![1]}). This usually means you are not logged in to reddit.com in this Firefox profile. Log in, then open a new tab.`
                : `Couldn't load wallpapers from Reddit: ${fetchError}`}
            </div>
          )}
          <header>
            <div className="header-left">
              <TimeDate />

              <div className="details hideable">
                <p className="to-load to-delay-1">{data?.title}</p>
                <p className="to-load to-delay-2">{data?.res}</p>
              </div>
            </div>

            <div className="header-right">
              <Config />
            </div>
          </header>

          <footer className="to-bottom hideable">
            <div className="attr">
              <p className="attr-from to-load to-delay-3">
                {data === null ? (
                  <strong>
                    No images found <FaSadTear size={20} />
                  </strong>
                ) : (
                  <>
                    Image from{" "}
                    <a href="https://reddit.com/r/animewallpaper">
                      <FaReddit size={20} /> r/Animewallpaper
                    </a>
                  </>
                )}
              </p>

              <p className="attr-bottom to-load to-delay-4">
                {data === null ? (
                  <>Try different filters! • Reddit down perhaps?</>
                ) : (
                  <>
                    Post <strong>#{(data?.nums[0] || 0) + 1}</strong> of{" "}
                    <strong>{data?.nums[1]}</strong> •{" "}
                    <a href={data?.link}>{data?.link}</a>
                  </>
                )}
              </p>

              {loaded !== LoadState.LOADED && !config.incognito && (
                <span className="attr-loader">
                  <PuffLoader color="white" size={18} />
                </span>
              )}
            </div>

            <div className="credits">
              <p>
                Created with <FaHeart /> •{" "}
                <a href="https://github.com/cf12/atarashii-tab">v{pkg.version}</a>
              </p>
            </div>

            <MenuButton />
            <Menu />
          </footer>
        </div>

        {data === null ? null : (
          <Image
            className="bg to-load-bg"
            src={data?.backgroundUrl || data?.url}
            alt=""
            onLoad={() => {
              setLoaded(LoadState.LOADED)
            }}
          />
        )}
      </div>
    </div>
  )
}

export default App
