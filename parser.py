from bs4 import BeautifulSoup  # Import BeautifulSoup for parsing HTML
import os  # Import os for file operations
import sys
import re
# Dictionary to store parsed data
main = {}
def sort_key(klasse):
    match = re.match(r"(\d+)([a-zA-Z]?)", klasse)
    if match:
        number = int(match.group(1))  # Extract the numeric part
        letter = match.group(2) or ""  # Extract the letter part, default to empty string
        return (number, letter)
    return (float('inf'), "")  # Fallback for unexpected cases


def parseHTML(file):
    """Parses an HTML file and extracts relevant data into the 'main' dictionary."""
    try:
        # Open the specified file from the 'log' directory
        with open(f"{os.path.dirname(__file__)}/log/{file}", "r") as fd:
            soup = BeautifulSoup(fd, "html.parser")
    except FileNotFoundError:
        print("File couldn't be found. To exit type exit")
        return
    except Exception as e:
        print("File couldn't be read from.")
        print(e)
        return
    
    # Find the first table with class 'mon_list'
    table = soup.find("table", {"class": "mon_list"})
    
    # Find all rows with class 'list odd' or 'list even'
    rows = table.find_all("tr", {"class": "list odd" or "list even"})
    
    # Extract the day information from the 'mon_title' div
    Day = soup.find("div", {"class": "mon_title"}).get_text().split(" ")[1]
    
    for row in rows:
        cells = row.find_all("td")  # Extract table cells from row
        Klassen = cells[0].get_text().split(", ")  # Extract class names
        
        for Klasse in Klassen: #loop through the classes
            # Initialize dictionary structure for class and day if not already present
            if Klasse not in main:
                main[Klasse] = {Day: {}}
            if Day not in main[Klasse]:
                main[Klasse][Day] = {}
            
            # Extract the range of hours
            Range = cells[1].get_text().split(" - ")
            if not Range[0].isdigit():  # Ensure valid numeric range
                continue
            if len(Range) < 2:  # Handle cases where range is incorrectly formatted
                Range = cells[1].get_text().split("-")
                if len(Range) < 2:
                    Range.append(Range[0])  # Default to single-hour range
            
            # Iterate through the hour range
            for Stunde in range(int(Range[0]), int(Range[1]) + 1):
                
                # Initialize structure for each hour if it does not exist
                if Stunde not in main[Klasse][Day]:
                    main[Klasse][Day][Stunde] = {
                        "Fach": {}, "Vertretungsfach": [], "Vertretungslehrer": [], "Raum": [], "Bemerkung": []
                    }
                
                # Count occurrences of subjects
                Fach = cells[2].get_text()
                if Fach not in main[Klasse][Day][Stunde]["Fach"]:
                    main[Klasse][Day][Stunde]["Fach"][Fach] = 1
                else:
                    main[Klasse][Day][Stunde]["Fach"][Fach] += 1
                
                # Append substitution details
                main[Klasse][Day][Stunde]["Vertretungsfach"].append(cells[3].get_text())
                main[Klasse][Day][Stunde]["Vertretungslehrer"].append(cells[4].get_text())
                main[Klasse][Day][Stunde]["Raum"].append(cells[5].get_text())
                main[Klasse][Day][Stunde]["Bemerkung"].append(cells[6].get_text())
    
    print(f"Successfully read from file: {file}")  # Confirm file read

# Loop through all files in the 'log' directory and parse them
for file in os.listdir(f"{os.path.dirname(__file__)}/log"):
    parseHTML(file)

print("\n")

# Sort and print the structured data
for Klasse, days in main.items():
    for day, subjects in days.items():
        main[Klasse][day] = dict(sorted(subjects.items()))
main = dict(sorted(sorted(main.items()), key=lambda item: sort_key(item[0])))
for Klasse, days in main.items():
    for day, changes in days.items():
        for Stunde, change in changes.items():
            print(f"{Klasse}: {day}: {Stunde}: {change["Fach"]}")
        print("")
    print("\n\n")
while True:
    Input = input("Which class would you like to get the timetable for? ").upper()
    if Input == "EXIT":
        SystemExit
    elif Input not in main:
        print(f"There is no data for this class. Available classes are: {main.keys()}. To exit type 'exit'.")
        continue
    Klasse = Input
    for day, changes in main[Input].items():
        for Stunde, change in changes.items():
            print(f"{Klasse}: {day}: {Stunde}: {change["Fach"]}")
        print("")
    print("\n\n")