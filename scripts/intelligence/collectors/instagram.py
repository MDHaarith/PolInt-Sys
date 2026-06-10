from __future__ import annotations

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
        )

    def collect(self):
        try:
            loader = self._loader()
            import instaloader

            for profile_name in self.profiles:
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
            self.health = {
                "status": "unavailable",
                "mode": "anonymous_public_only",
                "reason": str(exc),
            }
            return

