# DEMO_SEED_SOURCES.md — B7 photo provenance

All photos sourced from **Wikimedia Commons** via the Wikipedia REST summary
endpoint, then mirrored to Supabase storage. Each linked Commons file page
documents author, date, and license; the categories listed here are the
operative ones for our purposes.

## License posture

Every president's portrait is one of:
- A pre-1929 painting (US public domain — copyright expired)
- A US federal-government photograph (public domain — 17 U.S.C. § 105)
- A pre-1929 photograph (US public domain)

Every historic-home photograph is either a US federal photograph (NPS, HABS)
or a contributor-released CC-BY / CC-BY-SA / public-domain image on Wikimedia
Commons. None are scraped from paywalled or commercial sources.

## Per-president sources

### George Washington
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/washington.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/George_Washington
  - Source file: https://upload.wikimedia.org/wikipedia/commons/b/b6/Gilbert_Stuart_Williamstown_Portrait_of_George_Washington.jpg
  - License basis: pre-1929 portrait or US federal-government photograph (PD)
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/washington-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Mount_Vernon
  - Source file: https://upload.wikimedia.org/wikipedia/commons/e/e6/West_Face_of_Mansion%2C_Mount_Vernon%2C_Near_Alexandria%2C_Virginia_%282731038734%29.jpg
  - License basis: NPS / HABS federal photo OR Wikimedia contributor PD/CC release

### John Adams
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/j_adams.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/John_Adams
  - Source file: https://upload.wikimedia.org/wikipedia/commons/7/75/John_Adams_Portrait.jpg
  - License basis: pre-1929 portrait or US federal-government photograph (PD)
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/j_adams-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Peacefield
  - Source file: https://upload.wikimedia.org/wikipedia/commons/d/d3/Old_House%2C_Quincy%2C_Massachusetts.JPG
  - License basis: NPS / HABS federal photo OR Wikimedia contributor PD/CC release

### Thomas Jefferson
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/jefferson.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Thomas_Jefferson
  - Source file: https://upload.wikimedia.org/wikipedia/commons/0/07/Official_Presidential_portrait_of_Thomas_Jefferson_%28by_Rembrandt_Peale%2C_1800%29.jpg
  - License basis: pre-1929 portrait or US federal-government photograph (PD)
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/jefferson-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Monticello
  - Source file: https://upload.wikimedia.org/wikipedia/commons/5/5a/Monticello_reflected.JPG
  - License basis: NPS / HABS federal photo OR Wikimedia contributor PD/CC release

### James Madison
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/madison.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/James_Madison
  - Source file: https://upload.wikimedia.org/wikipedia/commons/1/1d/James_Madison.jpg
  - License basis: pre-1929 portrait or US federal-government photograph (PD)
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/madison-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Montpelier_(Orange,_Virginia)
  - Source file: https://upload.wikimedia.org/wikipedia/commons/5/5d/James_Madison%27s_Montpelier_June_2018_front_exterior.jpg
  - License basis: NPS / HABS federal photo OR Wikimedia contributor PD/CC release

### James Monroe
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/monroe.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/James_Monroe
  - Source file: https://upload.wikimedia.org/wikipedia/commons/5/5e/James_Monroe_White_House_portrait_1819_%28cropped%29%282%29.jpg
  - License basis: pre-1929 portrait or US federal-government photograph (PD)
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/monroe-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Highland_(James_Monroe_house)
  - Source file: https://upload.wikimedia.org/wikipedia/commons/6/6a/AshLawnHighland.jpg
  - License basis: NPS / HABS federal photo OR Wikimedia contributor PD/CC release

### Andrew Jackson
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/jackson.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Andrew_Jackson
  - Source file: https://upload.wikimedia.org/wikipedia/commons/2/2a/Andrew_jackson_head_%28cropped%29.jpg
  - License basis: pre-1929 portrait or US federal-government photograph (PD)
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/jackson-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/The_Hermitage_(Nashville,_Tennessee)
  - Source file: https://upload.wikimedia.org/wikipedia/commons/c/c9/The_Hermitage_by_Jim_Bowen.jpg
  - License basis: NPS / HABS federal photo OR Wikimedia contributor PD/CC release

### Abraham Lincoln
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/lincoln.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Abraham_Lincoln
  - Source file: https://upload.wikimedia.org/wikipedia/commons/5/57/Abraham_Lincoln_1863_Portrait_%283x4_cropped%29.jpg
  - License basis: pre-1929 portrait or US federal-government photograph (PD)
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/lincoln-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Lincoln_Home_National_Historic_Site
  - Source file: https://upload.wikimedia.org/wikipedia/commons/8/87/Lincoln_Home_1.jpg
  - License basis: NPS / HABS federal photo OR Wikimedia contributor PD/CC release

### Ulysses S. Grant
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/grant.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Ulysses_S._Grant
  - Source file: https://upload.wikimedia.org/wikipedia/commons/9/98/Ulysses_S._Grant_1870-1880_%28cropped%29.jpg
  - License basis: pre-1929 portrait or US federal-government photograph (PD)
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/grant-home.jpeg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Grant_Cottage_State_Historic_Site
  - Source file: https://upload.wikimedia.org/wikipedia/commons/9/93/GrantsCottage.jpeg
  - License basis: NPS / HABS federal photo OR Wikimedia contributor PD/CC release

### Theodore Roosevelt
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/t_roosevelt.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Theodore_Roosevelt
  - Source file: https://upload.wikimedia.org/wikipedia/commons/7/7d/Theodore_Roosevelt_by_the_Pach_Bros_%284x5_cropped%29.jpg
  - License basis: pre-1929 portrait or US federal-government photograph (PD)
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/t_roosevelt-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Sagamore_Hill_(house)
  - Source file: https://upload.wikimedia.org/wikipedia/commons/c/c0/Sagamore_Hill.jpg
  - License basis: NPS / HABS federal photo OR Wikimedia contributor PD/CC release

### William Howard Taft
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/taft.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/William_Howard_Taft
  - Source file: https://upload.wikimedia.org/wikipedia/commons/1/11/William_Howard_Taft_by_Pach_Brothers_%283x4_ropped%29_%28cropped%29.jpg
  - License basis: pre-1929 portrait or US federal-government photograph (PD)
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/taft-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/William_Howard_Taft_National_Historic_Site
  - Source file: https://upload.wikimedia.org/wikipedia/commons/e/e0/William_Howard_Taft_National_Historic_Site.JPG
  - License basis: NPS / HABS federal photo OR Wikimedia contributor PD/CC release

### Woodrow Wilson
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/wilson.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Woodrow_Wilson
  - Source file: https://upload.wikimedia.org/wikipedia/commons/9/96/President_Woodrow_Wilson_Harris_%26_Ewing_%283x4_cropped_b%29.jpg
  - License basis: pre-1929 portrait or US federal-government photograph (PD)
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/wilson-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Woodrow_Wilson_House_(Washington,_D.C.)
  - Source file: https://upload.wikimedia.org/wikipedia/commons/c/c6/Woodrow_Wilson_House_-_Washington%2C_D.C.jpg
  - License basis: NPS / HABS federal photo OR Wikimedia contributor PD/CC release

### Franklin D. Roosevelt
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/fdr.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Franklin_D._Roosevelt
  - Source file: https://upload.wikimedia.org/wikipedia/commons/f/fd/FDR-1944-Campaign-Portrait_%283x4_retouched%2C_cropped%29.jpg
  - License basis: pre-1929 portrait or US federal-government photograph (PD)
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/fdr-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Home_of_Franklin_D._Roosevelt_National_Historic_Site
  - Source file: https://upload.wikimedia.org/wikipedia/commons/0/05/East_facade_of_the_President%27s_house%2C_Home_of_Franklin_D._Roosevelt_National_Historic_Site_%28edited%29.jpg
  - License basis: NPS / HABS federal photo OR Wikimedia contributor PD/CC release

### Harry S. Truman
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/truman.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Harry_S._Truman
  - Source file: https://upload.wikimedia.org/wikipedia/commons/0/0b/TRUMAN_58-766-06_%28cropped%29.jpg
  - License basis: pre-1929 portrait or US federal-government photograph (PD)
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/truman-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Harry_S._Truman_National_Historic_Site
  - Source file: https://upload.wikimedia.org/wikipedia/commons/c/c6/Trumanhist.JPG
  - License basis: NPS / HABS federal photo OR Wikimedia contributor PD/CC release

### Dwight D. Eisenhower
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/eisenhower.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Dwight_D._Eisenhower
  - Source file: https://upload.wikimedia.org/wikipedia/commons/0/02/Dwight_D._Eisenhower%2C_official_photo_portrait%2C_May_29%2C_1959_%28cropped%29%283%29.jpg
  - License basis: pre-1929 portrait or US federal-government photograph (PD)
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/eisenhower-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Eisenhower_National_Historic_Site
  - Source file: https://upload.wikimedia.org/wikipedia/commons/7/7f/HABS_Eisenhower_Farm.jpg
  - License basis: NPS / HABS federal photo OR Wikimedia contributor PD/CC release

### John F. Kennedy
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/presidents/jfk.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/John_F._Kennedy
  - Source file: https://upload.wikimedia.org/wikipedia/commons/c/c3/John_F._Kennedy%2C_White_House_color_photo_portrait.jpg
  - License basis: pre-1929 portrait or US federal-government photograph (PD)
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/presidents/jfk-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/John_Fitzgerald_Kennedy_National_Historic_Site
  - Source file: https://upload.wikimedia.org/wikipedia/commons/3/3d/JFK_NHP.jpg
  - License basis: NPS / HABS federal photo OR Wikimedia contributor PD/CC release

## Storage paths

- `profile-photos/presidents/<key>.<ext>` — public bucket created in B7
- `listing-photos/presidents/<key>-home.<ext>` — existing public bucket

## Replay

If we ever need to re-fetch and re-upload, run:

```bash
npx tsx --env-file=.env.local scripts/_b7_fetch_photos.ts
```

The script is idempotent (uploads use `upsert: true`), and
`scripts/_b7_photo_results.json` is the single source of truth for the
URLs used in migration 050.


# DEMO_SEED_SOURCES.md (B7-051 expansion)

15 additional famous historical figures, all died pre-1980 (broad
public-domain coverage). Same sourcing model as the presidents:
Wikipedia REST summary endpoint → Wikimedia Commons original file →
mirrored to Supabase storage.

### Albert Einstein
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/einstein.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Albert_Einstein
  - Source file: https://upload.wikimedia.org/wikipedia/commons/2/28/Albert_Einstein_Head_cleaned.jpg
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/einstein-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Albert_Einstein_House
  - Source file: https://upload.wikimedia.org/wikipedia/commons/3/31/Albert-einstein-house.JPG

### Mark Twain
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/twain.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Mark_Twain
  - Source file: https://upload.wikimedia.org/wikipedia/commons/0/0c/Mark_Twain_by_AF_Bradley.jpg
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/twain-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Mark_Twain_House
  - Source file: https://upload.wikimedia.org/wikipedia/commons/3/30/House_of_Mark_Twain.jpg

### Marie Curie
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/curie.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Marie_Curie
  - Source file: https://upload.wikimedia.org/wikipedia/commons/c/c8/Marie_Curie_c._1920s.jpg
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/curie-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Maria_Sk%C5%82odowska-Curie_Museum
  - Source file: https://upload.wikimedia.org/wikipedia/commons/4/40/Kamienica_%C5%81yszkiewicza_w_Warszawie_2020.jpg

### Ernest Hemingway
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/hemingway.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Ernest_Hemingway
  - Source file: https://upload.wikimedia.org/wikipedia/commons/2/28/ErnestHemingway.jpg
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/hemingway-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Ernest_Hemingway_House
  - Source file: https://upload.wikimedia.org/wikipedia/commons/7/7a/Hemingwayhouse.jpg

### Vincent van Gogh
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/van_gogh.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Vincent_van_Gogh
  - Source file: https://upload.wikimedia.org/wikipedia/commons/4/4c/Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project_%28454045%29.jpg
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/van_gogh-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Auberge_Ravoux
  - Source file: https://upload.wikimedia.org/wikipedia/commons/5/5a/Auberge_ravoux.jpg

### Amelia Earhart
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/earhart.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Amelia_Earhart
  - Source file: https://upload.wikimedia.org/wikipedia/commons/7/72/Amelia_Earhart_standing_under_nose_of_her_Lockheed_Model_10-E_Electra%2C_small_%28cropped%29.jpg
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/earhart-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Amelia_Earhart_Birthplace_Museum
  - Source file: https://upload.wikimedia.org/wikipedia/commons/c/c7/Amelia_Earhart_birthplace_from_NE_1.JPG

### Helen Keller
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/keller.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Helen_Keller
  - Source file: https://upload.wikimedia.org/wikipedia/commons/7/7b/Helen_Keller_%28circa_1904%29.jpg
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/keller-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Ivy_Green
  - Source file: https://upload.wikimedia.org/wikipedia/commons/5/5c/Helen_Keller_Birthplace_House_in_Tuscumbia%2C_Alabama.jpg

### Eleanor Roosevelt
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/e_roosevelt.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Eleanor_Roosevelt
  - Source file: https://upload.wikimedia.org/wikipedia/commons/7/7d/Eleanor_Roosevelt_at_the_United_Nations%2C_circa_1946-1947_%283x4_cropped%29.jpg
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/e_roosevelt-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Val-Kill
  - Source file: https://upload.wikimedia.org/wikipedia/commons/1/12/Stone_Cottage_Val-Kill_NY1.jpg

### Winston Churchill
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/churchill.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Winston_Churchill
  - Source file: https://upload.wikimedia.org/wikipedia/commons/0/02/Sir_Winston_Churchill_-_19086236948_%28restored%29.jpg
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/churchill-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Chartwell
  - Source file: https://upload.wikimedia.org/wikipedia/commons/0/03/Chartwell_House%2C_rear.JPG

### Edgar Allan Poe
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/poe.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Edgar_Allan_Poe
  - Source file: https://upload.wikimedia.org/wikipedia/commons/9/97/Edgar_Allan_Poe%2C_circa_1849%2C_restored%2C_squared_off.jpg
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/poe-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Edgar_Allan_Poe_House_and_Museum
  - Source file: https://upload.wikimedia.org/wikipedia/commons/3/38/PoeHouse-Baltimore.jpg

### Beatrix Potter
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/potter.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Beatrix_Potter
  - Source file: https://upload.wikimedia.org/wikipedia/commons/9/93/Beatrix_Potter_by_King_cropped.jpg
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/potter-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Hill_Top,_Cumbria
  - Source file: https://upload.wikimedia.org/wikipedia/commons/b/b4/Hill_Top_Farm%2C_Near_Sawrey%2C_Cumbria_-_geograph.org.uk_-_43164.jpg

### Charles Darwin
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/darwin.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Charles_Darwin
  - Source file: https://upload.wikimedia.org/wikipedia/commons/2/2e/Charles_Darwin_seated_crop.jpg
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/darwin-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Down_House
  - Source file: https://upload.wikimedia.org/wikipedia/commons/6/6d/Down_House.jpg

### Walt Whitman
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/whitman.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Walt_Whitman
  - Source file: https://upload.wikimedia.org/wikipedia/commons/f/fa/Walt_Whitman_-_George_Collins_Cox.jpg
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/whitman-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Walt_Whitman_House
  - Source file: https://upload.wikimedia.org/wikipedia/commons/8/8b/Walt_Whitman%27s_house_Wellcome_L0010043.jpg

### F. Scott Fitzgerald
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/fitzgerald.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/F._Scott_Fitzgerald
  - Source file: https://upload.wikimedia.org/wikipedia/commons/d/dc/F._Scott_Fitzgerald_%281921_portrait_-_crop%29_Retouched.jpg
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/fitzgerald-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/F._Scott_Fitzgerald_House
  - Source file: https://upload.wikimedia.org/wikipedia/commons/a/a9/F._Scott_Fitzgerald_House.jpg

### Susan B. Anthony
- **Portrait** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/profile-photos/famous/anthony.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Susan_B._Anthony
  - Source file: https://upload.wikimedia.org/wikipedia/commons/2/28/SB_Anthony_from_RoRaWW.jpg
- **Historic home** — `https://ldoueidykjeglqndbaev.supabase.co/storage/v1/object/public/listing-photos/famous/anthony-home.jpg`
  - Wikipedia article: https://en.wikipedia.org/wiki/Susan_B._Anthony_House
  - Source file: https://upload.wikimedia.org/wikipedia/commons/4/4f/Susan_B_Anthony_House.jpg
