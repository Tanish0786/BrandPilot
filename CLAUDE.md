@AGENTS.md
# [Project name] — v1 Spec

Fill this in yourself before writing or prompting any code. If you can't fill in a section, that's a sign you haven't decided that part yet — decide it here, not in the middle of a Claude Code session.

## Problem
Who is this for, specifically? What do they do today instead of using this (Canva + guessing captions, hiring someone, not posting consistently)? One paragraph, no jargon.
this is for the local service buisnesses in specific but can be used by anyone who wants to generate social media captions for their business. Today, many local service business owners struggle to create engaging content for their social media platforms. They often rely on generic templates, spend hours brainstorming ideas, or hire expensive marketing agencies. This tool aims to simplify the process by providing a user-friendly platform that generates personalized captions based on the user's brand profile.
## User
Pick one real business type inside "local service businesses" to picture while you write this — a specific gym, not "gyms in general." Name it if you have one in mind for week 8 testing.
Anytime fitness, a local gym that offers personal training and group classes. The owner, Alex, is tech-savvy but has limited time to manage social media. Alex wants to maintain an active online presence to attract new members and engage with the current community without spending hours on content creation.
## Core loop (must be true for v1 to count as working)
1. User signs up
2. User builds a brand profile — via URL or via the no-website questionnaire                        
3. User reviews/edits the profile
4. Content generation agent produces social captions on request
5. User approves/edits/rejects each caption
6. (later weeks) Captions generate automatically on a schedule
#All this shall be their later when needed:
- live posting to social platforms
-  ad management
- competitor monitoring

## Out of scope — copy this from the roadmap, don't renegotiate it mid-build
- No multi-brand accounts
- No billing (yet)

## Success criteria for v1 (week 8)
What does "this worked" look like in a sentence a non-technical person would agree with? Example: "A real gym owner used it for a week and said the captions actually sounded like them."
the person should be able to sign up, create a brand profile, and generate social media captions that they can approve or edit. The captions should feel personalized and relevant to their business, and the user should feel confident in using the tool to maintain an active online presence.
## Day 1 — today's target
By end of day: signed-up user can log in on a live deployed URL. Nothing about profiles or content yet.
