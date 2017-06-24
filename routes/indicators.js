var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var session = require('client-sessions');
var path = require("path");

var app = express();

var config = require('../config.js');

app.use(session({
    cookieName: 'session',
    secret: config.secret,
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000
}));

// router.get('/', function(req, res, next) {
//     console.log("indicators");
//     if (req.session && req.session.user) {
//         console.log("logged in as " + req.session.user);
//         res.sendFile(path.join(__dirname+'/cbiindicators.html'));
//     } else {
//         console.log("not logged in");
//         req.session.reset();
//         res.redirect('/index');
//     }
// });

var cityIndicators = {
    indicators:[
            {
                number: 1,
                category: 1,
                title: "Proportion of Natural Areas in the City",
                userInput1: "Area",
                calculation: "(Total area of natural, restored and naturalised areas) ÷ (Total area of city)"
            },
            {
                number: 2,
                category: 1,
                title: "Connectivity Measures",
                userInput1: "Area",
                calculation: "\nWhere:\n\nA total is the total area of all natural areas\n\nA 1 to A n are areas that are distinct from each other (i.e. more than or equal to 100m apart)\n\nn is the total number of connected natural areas\n\nThis measures effective mesh size of the natural areas in the city. A 1 to A n may consist of areas that are the sum of two or more smaller patches which are connected. In general, patches are considered as connected if they are less than 100m apart.\nHowever, exceptions to the above rule includes\nanthropogenic barriers such as:\nRoads (15m or more in width; or are smaller but have a high traffic volume of more than 5000 cars per day)\nRivers that are highly modified and other artificial barriers such as heavily concretised canals and heavily built up areas. Any other artificial structures that the city would consider as a barrier"
            },
            {
                number: 3,
                category: 1,
                title: "Native Biodiversity in Built Up Areas (Bird Species)",
                userInput1: "Number of Species",
                calculation: "Number of native bird species in built up areas where built up areas include impermeable surfaces like buildings, roads, drainage channels, etc., and anthropogenic green spaces like roof gardens, roadside planting, golf courses, private gardens, cemeteries, lawns, urban parks, etc. Areas that are counted as natural areas in indicator 1 should not be included in this indicator."
            },
            {
                number: 4,
                category: 1,
                title: "Change in Number of Vascular Plant Species",
                userInput1: "Change in Number of Species",
                calculation: "The change in number of native species is used for indicators 4 to 8. The three core groups are:\nIndicator 4 : vascular plants\nIndicator 5 : birds\nIndicator 6 : butterflies\nThese groups have been selected as data are most easily available and to enable some common comparison. Cities can select any two other taxonomic groups for indicators 7 and 8 (e.g., bryophytes, fungi, amphibians, reptiles, freshwater fish, molluscs, dragonflies, beetles, spiders, hard corals, marine fish, seagrasses, sponges, etc.) The above data from the first application of the Singapore Index would be recorded in Part I: Profile of the City as the baseline. Net change in species from the previous survey to the most recent survey is calculated as: Total increase in number of species (as a result of re-introduction, rediscovery, new species found, etc.) minus number of species that have gone extinct."
            },
            {
                number: 5,
                category: 1,
                title: "Change in Number of Bird Species",
                userInput1: "Change in Number of Species",
                calculation: "The change in number of native species is used for indicators 4 to 8. The three core groups are:\nIndicator 4 : vascular plants\nIndicator 5 : birds\nIndicator 6 : butterflies\nThese groups have been selected as data are most easily available and to enable some common comparison. Cities can select any two other taxonomic groups for indicators 7 and 8 (e.g., bryophytes, fungi, amphibians, reptiles, freshwater fish, molluscs, dragonflies, beetles, spiders, hard corals, marine fish, seagrasses, sponges, etc.) The above data from the first application of the Singapore Index would be recorded in Part I: Profile of the City as the baseline. Net change in species from the previous survey to the most recent survey is calculated as: Total increase in number of species (as a result of re-introduction, rediscovery, new species found, etc.) minus number of species that have gone extinct."
            },
            {
                number: 6,
                category: 1,
                title: "Change in Number of Butterfly Species",
                userInput1: "Change in Number of Species",
                calculation: "The change in number of native species is used for indicators 4 to 8. The three core groups are:\nIndicator 4 : vascular plants\nIndicator 5 : birds\nIndicator 6 : butterflies\nThese groups have been selected as data are most easily available and to enable some common comparison. Cities can select any two other taxonomic groups for indicators 7 and 8 (e.g., bryophytes, fungi, amphibians, reptiles, freshwater fish, molluscs, dragonflies, beetles, spiders, hard corals, marine fish, seagrasses, sponges, etc.) The above data from the first application of the Singapore Index would be recorded in Part I: Profile of the City as the baseline. Net change in species from the previous survey to the most recent survey is calculated as: Total increase in number of species (as a result of re-introduction, rediscovery, new species found, etc.) minus number of species that have gone extinct."
            },
            {
                number: 7,
                category: 1,
                title: "Change in Number of Native Species (any other taxonomic group selected by the city)",
                userInput1: "Change in Number of Species",
                calculation: "The change in number of native species is used for indicators 4 to 8. The three core groups are:\nIndicator 4 : vascular plants\nIndicator 5 : birds\nIndicator 6 : butterflies\nThese groups have been selected as data are most easily available and to enable some common comparison. Cities can select any two other taxonomic groups for indicators 7 and 8 (e.g., bryophytes, fungi, amphibians, reptiles, freshwater fish, molluscs, dragonflies, beetles, spiders, hard corals, marine fish, seagrasses, sponges, etc.) The above data from the first application of the Singapore Index would be recorded in Part I: Profile of the City as the baseline. Net change in species from the previous survey to the most recent survey is calculated as: Total increase in number of species (as a result of re-introduction, rediscovery, new species found, etc.) minus number of species that have gone extinct."
            },
            {
                number: 8,
                category: 1,
                title: "Change in Number of Native Species (any other taxonomic group selected by the city)",
                userInput1: "Change in Number of Species",
                calculation: "The change in number of native species is used for indicators 4 to 8. The three core groups are:\nIndicator 4 : vascular plants\nIndicator 5 : birds\nIndicator 6 : butterflies\nThese groups have been selected as data are most easily available and to enable some common comparison. Cities can select any two other taxonomic groups for indicators 7 and 8 (e.g., bryophytes, fungi, amphibians, reptiles, freshwater fish, molluscs, dragonflies, beetles, spiders, hard corals, marine fish, seagrasses, sponges, etc.) The above data from the first application of the Singapore Index would be recorded in Part I: Profile of the City as the baseline. Net change in species from the previous survey to the most recent survey is calculated as: Total increase in number of species (as a result of re-introduction, rediscovery, new species found, etc.) minus number of species that have gone extinct."
            },
            {
                number: 9,
                category: 1,
                title: "Proportion of Protected Natural Areas",
                userInput1: "Area",
                calculation: "(Area of protected or secured natural areas) ÷ (Total area of the city)"
            },
            {
                number: 10,
                category: 1,
                title: "Proportion of Invasive Alien Species",
                userInput1: "Proportion",
                calculation: "(Number of invasive alien species) ÷ (Total number of species)"
            },
            {
                number: 11,
                category: 2,
                title: "Regulation of Quantity of Water",
                userInput1: "Area",
                calculation: "(Total permeable area) ÷ (Total terrestrial area of the city)"
            },
            {
                number: 12,
                category: 2,
                title: "Climate Regulation: Carbon Storage and Cooling Effect Of Vegetation",
                userInput1: "Tree Canopy Cover Area",
                calculation: "(Tree canopy cover) ÷ (Total terrestrial area of the city)"
            },
            {
                number: 13,
                category: 2,
                title: "Recreational and Educational Services: Area of Parks with Natural Areas",
                userInput1: "Area of Parks with Natural Areas",
                calculation: "(Area of parks with natural areas and protected or secured natural areas)*/1000 persons"
            },
            {
                number: 14,
                category: 2,
                title: "Recreational and Educational Services: Number of Formal Education Visits per Child Below 16 Years to Parks with Natural Areas per Year",
                userInput1: "Average number of formal educational visits per child below 16 years to parks with natural areas or protected or secured natural areas per year",
                calculation: "Average number of formal educational visits per child below 16 years to parks with natural areas or protected or secured natural areas per year"
            },
            {
                number: 15,
                category: 3,
                title: "Budget Allocated to Biodiversity",
                userInput1: "Amount Spent",
                calculation: "(Amount spent on biodiversity related administration) ÷ (Total budget of city)\n\nComputation should include the city’s or municipality’s manpower budget as well as its operational and biodiversity related project expenditures. The calculation may also include the figures of government linked corporations that have a component spent on biodiversity, and the amount of government funds paid to private companies for biodiversity related administration where such figures are available."
            },
            {
                number: 16,
                category: 3,
                title: "Number of Biodiversity Projects Implemented by the City Annually",
                userInput1: "Number of Projects",
                calculation: "Number of programmes and projects that are being implemented by the city authorities, possibly in partnership with private sector, NGOs, etc. per year. In addition to submitting the total number of projects and programmes carried out, cities are encouraged to provide a listing of the projects and to categorise the list into projects that are:\n1. Biodiversity related\n2. Ecosystems services related"
            },
            {
                number: 17,
                category: 3,
                title: "Policies, Rules and Regulations – Existence of Local Biodiversity Strategy and Action Plan"
            },
            {
                number: 18,
                category: 3,
                title: "Institutional Capacity: Number of Biodiversity Related Functions"
            },
            {
                number: 19,
                category: 3,
                title: "Institutional Capacity: Number of City or Local Government Agencies Involved in Inter-agency Co-operation Pertaining to Biodiversity Matters"
            },
            {
                number: 20,
                category: 3,
                title: "Participation and Partnership: Existence of Formal or Informal Public Consultation Process"
            },
            {
                number: 21,
                category: 3,
                title: "Participation and Partnership: Number of Agencies/Private Companies/NGOs/Academic Institutions/International Organisations with which the City is Partnering in Biodiversity Activities, Projects and Programmes"
            },
            {
                number: 22,
                category: 3,
                title: "Education and Awareness: Is Biodiversity or Nature Awareness Included in the School Curriculum"
            },
            {
                number: 23,
                category: 3,
                title: "Education and Awareness: Number of Outreach or Public Awareness Events Held in the City per Year"
            }
        
        
        // {number:1, category:1, title:"title", data:[
        //     {title:"Total Area", value:90, units:"km"},
        //     {title:"Data Year", value:2017},
        //     {title:"Notes", value:"These are my notes"}
        // ], calculation:"Calculation: This is going to be complex"},
        // {number:2, category:1, title:"Other Title", data:[
        //     {title:"Tree canopy cover", value:10},
        //     {title:"Data Year", value:2017},
        //     {title:"Notes", value:"These are my notes"}
        // ], calculation:"Calculation: This is going to be complex"},
        // {number:3, category:1, title:"Third title", data:[
        //     {title:"Total Area", value:90, units:"km"},
        //     {title:"Data Year", value:2017},
        //     {title:"Notes", value:"These are my notes"}
        // ], calculation:"Calculation: This is going to be complex"}
    ]
};

router.get('/', function(req, res, next) {
    console.log("logged in as " + req.session.user);
    res.render('indicators',{userName: req.session.user, cityIndicators:cityIndicators});
});

module.exports = router;