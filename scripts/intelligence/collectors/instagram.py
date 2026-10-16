from __future__ import annotations

import sys

from ..models import CollectedItem, now_utc_iso


class InstagramCollector:
    name = "instagram"

    def __init__(self, profiles, loader_factory=None, max_posts_per_profile=20):
        self.profiles = profiles
        self.loader_factory = loader_factory
        self.max_posts_per_profile = max_posts_per_profile
        self.health = {"status": "ready", "mode": "anonymous_public_only"}

    def _loader(self):
        if self.loader_factory:
            return self.loader_factory()
        import instaloader

        return instaloader.Instaloader(
            download_pictures=False,
            download_videos=False,
            download_video_thumbnails=False,
            save_metadata=False,
            compress_json=False,
            quiet=True,
            max_connection_attempts=1,
            request_timeout=10,
        )

    def collect(self):
        try:
            loader = self._loader()
            import instaloader

        except Exception as exc:
            print(f"[instagram] setup: {type(exc).__name__}: {exc}", file=sys.stderr)
            self.health.update(
                status="unavailable", reason=str(exc), last_error=f"{type(exc).__name__}: {exc}",
                setup_failures=self.health.get("setup_failures", 0) + 1,
            )
            return
        for profile_name in self.profiles:
            try:
                profile = instaloader.Profile.from_username(loader.context, profile_name)
                for index, post in enumerate(profile.get_posts()):
                    if index >= self.max_posts_per_profile:
                        break
                    shortcode = post.shortcode
                    caption = post.caption or ""
                    yield CollectedItem(
                        canonical_url=f"https://www.instagram.com/p/{shortcode}/",
                        collector="instaloader",
                        source_name=f"Instagram @{profile_name}",
                        source_type="instagram_public",
                        platform="instagram",
                        external_id=shortcode,
                        title=caption[:180] or f"Instagram post by @{profile_name}",
                        body=caption,
                        author_name=profile_name,
                        published_at=post.date_utc.isoformat() + "Z",
                        retrieved_at=now_utc_iso(),
                        politician_id=None,
                        category="social_media",
                        verification_status="unverified_chatter",
                        raw_metadata={
                            "likes": getattr(post, "likes", None),
                            "comments": getattr(post, "comments", None),
                        },
                    )
            except Exception as exc:
                print(f"[instagram] {profile_name!r}: {type(exc).__name__}: {exc}", file=sys.stderr)
                self.health.update(
                    status="degraded", last_error=f"{type(exc).__name__}: {exc}",
                    profile_failures=self.health.get("profile_failures", 0) + 1,
                )
