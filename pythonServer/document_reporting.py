# -*- coding: utf-8 -*-
import pandas as pd
import seaborn as sns
from sqlalchemy import create_engine
import config
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter
import pycountry_convert as pc


def read_sql(table):
    engine = create_engine("mysql+pymysql://" + config.username + ":" + config.password + "@" + config.hostname + ":" + config.portnumber + "/" + config.databasename + "")
    connection = engine.connect()
    # for chunk in pd.read_sql_query('CALL getAllDocumentsProcedure();', connection, chunksize=5):
    #     print(chunk)
    if table == 1:
        cursorResult = engine.execute('CALL getAllDocumentsProcedure();', multi=True)
    elif table == 0:
        cursorResult = engine.execute('CALL getAllLocationsProcedure();', multi=True)


    dataFrame = pd.DataFrame(cursorResult)
    # dataFrame = pd.read_sql_query('CALL getAllDocumentsProcedure();', connection)
    # The above code fails if this limit is removed. We don't know why yet. Additional research: why does sqlalchemy cursor have error closing when there is no limit? We tried iterating with chunks, but that simply fails for more very long reasons.
    # next debug query to SO: pandas read_sql without limit
    # https://stackoverflow.com/questions/18107953/how-to-create-a-large-pandas-dataframe-from-an-sql-query-without-running-out-of
    # dataFrame = pd.DataFrame()
    # for chunk in pd.read_sql('select * from documents', connection, chunksize=10):
    #     dataFrame.append(chunk)
    connection.close()
    
    return dataFrame


def read_excel(xlsFile, sheet):
    dataFrame = pd.read_excel(xlsFile, sheet_name=sheet)
    return dataFrame


def get_unique_values(dataFrame, column):
    values = sorted(list(dataFrame[column].dropna().unique()))
    return values


def construct_lf_dataframe(dataFrame,colNameVar,colNameYears):
    # get number of years in database
    years = get_unique_values(dataFrame, colNameYears)
    numberYears = len(years)
    # get number of types of desired variable (e.g., document type, continent)
    varTypes = get_unique_values(dataFrame, colNameVar)
    numberVarTypes = len(varTypes)
    # define number of rows in long form dataframe 
    N = numberYears*numberVarTypes
    
    # initialize counter and lists 
    k = 0 
    yearsList = []
    varTypesList = []
    numDocsList = []
    
    # begin loop for building lists to put into empty data frame
    for i in years:
        for j in varTypes:
            # build lists
            yearsList.append(i)
            varTypesList.append(j)
            numDocs = len(dataFrame[(dataFrame[colNameYears] == i) & 
                                    (dataFrame[colNameVar] == j)])
            numDocsList.append(numDocs)
            k += 1    

    # define columns for new dataframe
    columnNames = ['Year',colNameVar,'Number of Documents']
    # create new dataframe (long form)
    dataFrameLf = pd.DataFrame(columns=columnNames,index=range(N))
    dataFrameLf['Year'] = yearsList
    dataFrameLf['Number of Documents'] = numDocsList
    dataFrameLf[colNameVar] = varTypesList
    
    return dataFrameLf,numberVarTypes

def get_continent(lat, lon):
    # dictionary containing continent codes (keys) and full names (values)
    continent_dict = {
        "NA": "North America",
        "SA": "South America",
        "AS": "Asia",
        "AF": "Africa",
        "OC": "Oceania",
        "EU": "Europe",
        "AQ" : "Antarctica"
    }
    
    geolocator = Nominatim(user_agent="<abnerbog@buffalo.edu", timeout=10)
    geocode = RateLimiter(geolocator.reverse, min_delay_seconds=1)
    
    try:
        location = geocode(f"{lat}, {lon}", language="en")
        
        # extract country code
        address = location.raw["address"]
        country_code = address["country_code"].upper()

        # get continent code from country code
        continent_code = pc.country_alpha2_to_continent_code(country_code)
        continent_name = continent_dict[continent_code]
     
    # for cases where the location is not found, return continent name as None
    except:
        continent_name =  None

    return continent_name

def add_continent_to_dataframe(dataFrameInst,dataFrameDocs,colNameIdDoc,
                                    colNameIdInst,colNameLat,colNameLong,
                                    colNameContinent):
    # make copy of docs dataframe 
    dataFrameDocsCopy = dataFrameDocs.copy()
    
    # add new column in docs dataframe (initialize all values to None)
    dataFrameDocsCopy[colNameContinent] = None
    
    # begin loop for populating continent name in documents dataframe
    N = dataFrameDocsCopy.shape[0]
    
    for i in range(N):
        
        # lookup coordinates in inst. dataframe from inst. id in documents dataframe
        inst_id = dataFrameDocsCopy[colNameIdDoc][i]
        lookup_row = dataFrameInst.index[dataFrameInst[colNameIdInst] == inst_id].to_list()[0]
        # print(lookup_row)
        # grab latitude and longitude values from this row
        latitude = dataFrameInst[colNameLat][lookup_row]
        longitude = dataFrameInst[colNameLong][lookup_row]
        # populate the continent column
        dataFrameDocsCopy[colNameContinent][i] = get_continent(latitude, longitude)
        
    return dataFrameDocsCopy

def plot_data(dataFrame,numberVarTypes,nameVarType):
    # define file name for saving (SVG image)
    saveFile = nameVarType + '.svg'
    
    # make all the prominent curves in each subgraph green
    color = sns.cubehelix_palette(start=2, rot=0, dark=0.5, 
                                  light=0.5,n_colors=numberVarTypes)
    
    # make relational plots onto facet grid 
    g = sns.relplot(data = dataFrame, x = "Year", y = "Number of Documents",
                    col = nameVarType, hue = nameVarType,
                    kind = "line", palette = color,   
                    linewidth = 4, zorder = 5,
                    col_wrap = 3, height = 1.75, aspect = 1.5, legend = False
                   )
    
    #add text and silhouettes
    for time, ax in g.axes_dict.items():
        ax.text(.1, 1, time,
                transform = ax.transAxes, fontweight="bold"
               )
        sns.lineplot(data = dataFrame, x = "Year", y = "Number of Documents", units=nameVarType,
                     estimator = None, color= ".7", linewidth=1, ax=ax
                    )
    
    # set labels for each subgraph and tighten layout
    g.set_titles("")
    g.set_axis_labels("Year", "# Documents")
    g.tight_layout() 
    g.savefig(saveFile)


def main(excel,docsSheet,instSheet,colNameDocType,colNameYear,colNameIdDoc,
                                    colNameIdInst,colNameLat,colNameLong,
                                    colNameContinent):
    
    # return dataframe from documents table
    docsDataFrame = read_sql(docsSheet)
    # return dataframe from locations/institution table
    instDataFrame = read_sql(instSheet)
    
    # # return dataframe from excel file (documents tab)
    # docsDataFrame = read_excel(excel,docsSheet)
    # # return dataframe from excel file (institution tab)
    # instDataFrame = read_excel(excel,instSheet)

    # add continent to institutions dataframe
    instDataFrameNew = add_continent_to_dataframe(instDataFrame, docsDataFrame, colNameIdDoc, colNameIdInst, colNameLat, colNameLong, colNameContinent)
    
    # tabulate the number of document types per year into long form dataframe
    docsDataFrameLong,numDocumentTypes = construct_lf_dataframe(docsDataFrame,colNameDocType,colNameYear)
    # tabulate the number of continents per year into long form dataframe
    instDataFrameNewLong,numContinents = construct_lf_dataframe(instDataFrameNew,colNameContinent,colNameYear)
    
    # plot the data using a relational plot
    plot_data(docsDataFrameLong,numDocumentTypes,colNameDocType)
    # plot the data using a relational plot
    plot_data(instDataFrameNewLong,numContinents,colNameContinent)


if __name__ == "__main__":

    ################################### INPUTS ####################################

    # UBHub database location (excel sheet; will need to update)
    excelFile = 'UBHub_database_test.xlsx'
    
    # sheet number in excel file where document type data is stored
    documentsTab = 1
    # column name pointing to document type (e.g., Biodiversity Plan)
    docTypeColName = 'doc_type'
    # column name pointing to year of document reporting
    yearColName = 'doc_year'
    # column name pointing to institution id (document tab)
    idColNameDoc = 'inst_id'
    
    # sheet number in excel file where institution data is stored
    institutionsTab = 0 
    # column name pointing to latitude
    latColName = 'lat'
    # column name pointing to longitude
    longColName = 'lng'
    # column name pointing to institution id (institution tab)
    idColNameInst = 'id'
    # column name pointing to new continent column
    contColName = 'continent'
    
    # if false, run through main function
    testing = False

    ############################### TESTING FLAGS #################################

    # read excel file
    readExcel = True
    # get unique values from specific column of dataframe
    getUniqueValues = False
    # construct a long form dataframe with number of documents tabulated
    constructLFDataFrame = True
    # get continent name from latitude and longitude values
    getContinent = False
    # add continent name to documents dataframe
    addContinentToDataframe = False
    # make relational plot between different document types over time
    plotData = True

    ###############################################################################

    if testing:
        if readExcel:
            df = read_excel(excelFile, documentsTab)
            df2 = read_excel(excelFile, institutionsTab)
            if getUniqueValues:
                vals = get_unique_values(df, docTypeColName)
            if addContinentToDataframe:
                dfDocsNew = add_continent_to_dataframe(df2, df, idColNameDoc, idColNameInst, latColName, longColName)
            if constructLFDataFrame:
                dfLongForm,numDocsTypes = construct_lf_dataframe(df, docTypeColName, yearColName)
                if plotData:
                    plot_data(dfLongForm, numDocsTypes)
        if getContinent:
            # Arkhangelsk Oblast, Russia (Europe)
            lat = 61.2195686
            lon = 43.11476973933877
            continent = get_continent(lat, lon)

    else:
        main(excelFile,documentsTab,institutionsTab,docTypeColName,yearColName,idColNameDoc,idColNameInst,latColName,longColName,contColName)

