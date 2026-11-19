# Jus Cogens

An iPhone-installable reader for international criminal law and human rights, with a focus on the
Central African Republic and its Special Criminal Court. Same static site + hourly GitHub Action pattern
as The Commonplace and Degrees.

Sources, filters and the CAR / ICC tags live in `scripts/update.py` (`SOURCES`, `TAGS`, `THEMES`).

| Tab | What it gathers |
|---|---|
| CAR & SCC | Radio Ndeke Luka, Corbeau News, Oubangui Medias, RFI Afrique (justice stories), UN News (CAR), Google News for the Special Criminal Court in French and English, plus any CAR-related story from other desks |
| ICC | ICC press releases (Google News fallback when the site blocks bots), Coalition for the ICC, plus any ICC story from other desks |
| Courts | Justice Info, ICJ (via Google News), Kosovo Specialist Chambers, IRMCT, TRIAL International |
| Human rights | Human Rights Watch, Amnesty International, FIDH, UN News human rights |
| Analysis | EJIL:Talk!, Opinio Juris, Just Security (ICL/IHL posts), Articles of War, ICRC Law & Policy |

The front page opens with "The week in international justice", rebuilt daily from the past 7 days.
