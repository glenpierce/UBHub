# -*- coding: utf-8 -*-
import pandas as pd
import seaborn as sns
from sqlalchemy import create_engine
import config


def read_sql():
    engine = create_engine("mysql+pymysql://" + config.username + ":" + config.password + "@" + config.hostname + ":" + config.portnumber + "/" + config.databasename + "")
    connection = engine.connect()
    # for chunk in pd.read_sql_query('CALL getAllDocumentsProcedure();', connection, chunksize=5):
    #     print(chunk)
    cursorResult = engine.execute('CALL getAllDocumentsProcedure();', multi=True)

    dataFrame = pd.DataFrame(cursorResult)
    # dataFrame = pd.read_sql_query('CALL getAllDocumentsProcedure();', connection)
    # The above code fails if this limit is removed. We don't know why yet. Additional research: why does sqlalchemy cursor have error closing when there is no limit? We tried iterating with chunks, but that simply fails for more very long reasons.
    # next debug query to SO: pandas read_sql without limit
    # https://stackoverflow.com/questions/18107953/how-to-create-a-large-pandas-dataframe-from-an-sql-query-without-running-out-of
    # dataFrame = pd.DataFrame()
    # for chunk in pd.read_sql('select * from documents', connection, chunksize=10):
    #     dataFrame.append(chunk)
    connection.close()
    print(dataFrame)
    return dataFrame


def read_excel(xlsFile, sheet):
    dataFrame = pd.read_excel(xlsFile, sheet_name=sheet)
    return dataFrame


def get_unique_values(dataFrame, column):
    values = sorted(list(dataFrame[column].dropna().unique()))
    return values


def construct_lf_dataframe(dataFrame, colNameDocs, colNameYears):
    years = get_unique_values(dataFrame, colNameYears)
    numberYears = len(years)

    docTypes = get_unique_values(dataFrame, colNameDocs)
    numberDocTypes = len(docTypes)

    N = numberYears*numberDocTypes

    # initialize counter and lists
    k = 0
    yearsList = []
    docTypesList = []
    numDocsList = []

    # begin loop for building lists to put into empty data frame
    for i in years:
        for j in docTypes:
            # build lists
            yearsList.append(i)
            docTypesList.append(j)
            numDocs = len(dataFrame[(dataFrame[colNameYears] == i) &
                                    (dataFrame[colNameDocs] == j)])
            numDocsList.append(numDocs)
            k += 1

            # define columns for new dataframe
    columnNames = ['Year', 'Document Type', 'Number of Documents']
    # create new dataframe (long form)
    dataFrameLf = pd.DataFrame(columns=columnNames, index=range(N))
    dataFrameLf['Year'] = yearsList
    dataFrameLf['Document Type'] = docTypesList
    dataFrameLf['Number of Documents'] = numDocsList

    return dataFrameLf, numberDocTypes


def plot_data(dataFrame, numberDocTypes):

    # make all the prominent curves in each subgraph green
    color = sns.cubehelix_palette(start=2, rot=0, dark=0.5,
                                  light=0.5, n_colors=numberDocTypes)

    # make relational plots onto facet grid
    plot = sns.relplot(data=dataFrame, x="Year", y="Number of Documents",
                    col="Document Type", hue="Document Type",
                    kind="line", palette=color,
                    linewidth=4, zorder=5,
                    col_wrap=5, height=1.75, aspect=1.5, legend=False
                    )

    # add text and silhouettes
    for time, ax in plot.axes_dict.items():
        ax.text(.1, 1, time,
                transform=ax.transAxes, fontweight="bold"
                )
        sns.lineplot(data=dataFrame, x="Year", y="Number of Documents", units="Document Type",
                     estimator=None, color=".7", linewidth=1, ax=ax
                     )

    # set labels for each subgraph and tighten layout
    plot.set_titles("")
    plot.set_axis_labels("Year", "# Documents")
    plot.tight_layout()

    plot.savefig("test3.svg")


def main(excel, sheet, colNameDocType, colNameYear):

    # dataFrame = read_excel(excel, sheet)
    dataFrame = read_sql()

    # tabulate the number of document types per year into long form dataframe
    dataFrameLong,numDocumentTypes = construct_lf_dataframe(dataFrame, colNameDocType, colNameYear)

    # plot the data using a relational plot
    plot_data(dataFrameLong,numDocumentTypes)


if __name__ == "__main__":

    ################################### INPUTS ####################################

    # UBHub database location (excel sheet; will need to update)
    excelFile = 'UBHub_database_test.xlsx'
    # sheet number in excel file where document type data is stored
    tab = 1
    # column name pointing to document type (e.g., Biodiversity Plan)
    docTypeColName = 'doc_type'
    # column name pointing to year of document reporting
    yearColName = 'doc_year'
    # if false, run through main function
    testing = False

    ############################### TESTING FLAGS #################################

    # read excel file
    readExcel = True
    # get unique values from specific column of dataframe
    getUniqueValues = False
    # construct a long form dataframe with number of documents tabulated
    constructLFDataFrame = True
    # make relational plot between different document types over time
    plotData = True

    ###############################################################################

    if testing:
        if readExcel:
            df = read_excel(excelFile, tab)
        if getUniqueValues:
            vals = get_unique_values(df, docTypeColName)
        if constructLFDataFrame:
            dfLongForm,numDocsTypes = construct_lf_dataframe(df, docTypeColName, yearColName)
        if plotData:
            plot_data(dfLongForm, numDocsTypes)
    else:
        main(excelFile, tab, docTypeColName, yearColName)
