"""
AthleteIQ — entry point.

  python main.py                          # run full pipeline (all 5 sports, 10 athletes each)
  python main.py --sport football         # single sport
  python main.py --athlete "LeBron James" --sport basketball
  python main.py --score                  # recompute Brand Power Scores only (no re-scraping)
"""

import sys
from pipeline.pipeline_runner import main

if __name__ == "__main__":
    main()
