# GUI Data Fixtures

Purpose:
- Store committed graph data fixtures that let the GUI boot after a fresh clone.

Files:
- `demo_concept_list_cleaned.txt`: committed demo graph used when the synced runtime file is absent.
- `concept_list_cleaned_hyphen_fixture.txt`: regression fixture for legacy hyphen path-prefix parsing.

Notes:
- `gui/public/data/concept_list_cleaned.txt` is a derived sync target written by `brain/sync_concept_data.py` and is git-ignored.
- The GUI loader tries the derived sync target first and falls back to `demo_concept_list_cleaned.txt`.
