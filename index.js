const fetch = require('isomorphic-unfetch')
const fs = require('fs')

const zipcodes = require('./zipcodes.json')

// ACIS API Helper for formatting the body
const { yearBody } = require('./options')

async function fetchAcisData(body) {
  const res = await fetch("https://data.rcc-acis.org/GridData?", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "content-type": "application/json",
    },
  });
  return await res.json();
}

const CACHE_PATH = './cache.json'
// Number of zip codes within a batch
const BATCH_SIZE = 10
// Wait time in between batches in ms
const WAIT_TIME = 50

async function fetchDataFromZipCodes(start = 0, end = BATCH_SIZE){
	  // End Batch when Zip Codes are complete!
		if(start >= zipcodes.length){
			console.log('Completed!')
			return 'Finished'
		}
		// Slice zip codes by range 
    slices = zipcodes.slice(start, end);

		// Read any previous cached records from file 
		// See prevCache.json for an example output (first 1400 results)
		const cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
		
		
		console.log(`Fetching zip code results ${start}-${end}`)

		// Fetch results  
		const batch = await Promise.all(slices.map(async (zip) => {
				// Optional formatting for the body of the  fetch request
				// Modify this to match your parameters
				const body = yearBody(zip.longitude, zip.latitude);

				const {data} = await fetchAcisData(body)

				// Optional formatting for the resulting object
				// You may want to modify this depending on the shape of the data you are requesting
				return {
					[zip.zipcode]: data.map(record => ({
						year: record[0],
						averageTemp: record[1],
						maxTemp: record[2],
						minTemp: record[3]
					}))
				}
		}))

		// Set timeout block to avoid rate limits
		return await setTimeout(async () => {
			const newCache = [...cache, ...batch];

			console.log("Writing files to cache");
		
			// Write Results to cache file
			fs.writeFileSync(CACHE_PATH, JSON.stringify(newCache), "utf-8");
		
			console.log(`Wrote ${batch.length} objects to cache!`)

			// Recursive call to initiate next batch sequence
			return await fetchDataFromZipCodes(start+BATCH_SIZE, end+BATCH_SIZE);
		}, WAIT_TIME);		
}


fetchDataFromZipCodes()