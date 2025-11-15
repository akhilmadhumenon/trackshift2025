import fastf1
session = fastf1.get_session(2024, 'Monaco', 'R')
session.load()
laps = session.laps