//Read & parse data from files entered in the form.

var inputs = {"product": null, "choice": null, "interface": null},
ranked_product_ids;

for (let input_label of Object.keys(inputs)) {
	var input_el = document.getElementById(input_label);
	input_el.addEventListener("change", readFile);
};

function readFile(evnt) {
        var reader = new FileReader();
        reader.onload = function () {
		inputs[evnt.target.id] = parseInput(reader.result);

		if (evnt.target.id === "product") {
			ranked_product_ids = sort_rank_products();
		}
	};

	reader.readAsBinaryString(evnt.target.files[0]);
};

function parseInput(input) {
	var rows = input.split("\r\n"),
	columns = rows[0].split(","),
	data = {};
	
	for (let row = 0; row < rows.length; row++) {
		let row_data = rows[row].split(",");

		for (let col = 0; col < columns.length; col++) {
			//Make the column headings the data object's keys
			if (row === 0) {
				data[columns[col]] = [];
			}
			//Fill each row of the column with the appropriate value
			else {
				data[columns[col]].push(row_data[col]);
			}
		}
	}

	return data;
}

//NOTE: ranked_product_ids were a distraction and are no longer being used.
//Sort the product qualities in each set so that their indices correspond to their rank.
function sort_rank_products() {
	var ranked_products_ids = {};

	for (let set_label of Object.keys(inputs["product"])) {
		ranked_products_ids[set_label] = inputs["product"][set_label].sort((a,b) => (a - b));
	}

	return ranked_product_ids;
}

//Generate and download the information adversity data if button clicked.

var button = document.getElementById("submit");
button.addEventListener("click", generate_results);

function generate_results() {
	var output_data = getInfoAdv(),
	labels = Object.keys(output_data),
	columns = Object.values(output_data),
	max_rows = Math.max(...columns.map(column => column.length)),
	output_csv = "data:text/csv;charset=utf-8," + labels.join(",") + "\n";

	for (let row = 0; row < max_rows; row++) {
		let row_data = columns.map(function(column) {
			if (column.length - 1 >= row) {
				return column[row];
			}
			else {
				return "";
			}
		});

		let row_string = row_data.join(",");
		output_csv += row_string + "\n";
	}

	var encoded_URI = encodeURI(output_csv);
	window.open(encoded_URI);
}

//If the parsed data is available, calculate the information adversity values.

function getInfoAdv() {
	var result = {};

	if (Object.values(inputs).includes(null)) {
		throw "Some data is either missing or couldn't be parsed.";
	}

	//Calculate the individual and aggregate info adversities for each interface.
	for (let interface_id of Object.keys(inputs["interface"])) {
		result[interface_id] = [];

		let subject_ids = inputs["interface"][interface_id][0].split(";");

		//Calculate and store the information adversity for each individual.
		for (let subject_id of subject_ids) {
			result[interface_id][subject_id] = getIndivInfoAdv(subject_id);
		}

		//Calculate and store the aggregate information adversity for all users of the interface.
		let aggregate_info_adv = result[interface_id].reduce((total, current) => total + current) / subject_ids.length;
		result[interface_id].push(aggregate_info_adv);
	}

	return result;
}

//Get the information adversity for an individual.
function getIndivInfoAdv(subject_id) {
	var sum_expected_ranks = 0,
	sum_max_ranks = 0;

	//Get their information adversity for each substitute set.
	for (let set_label of Object.keys(inputs["choice"])) {
		let choices = inputs["choice"][set_label][subject_id].split(";"),
		choice_ranks = [];
		
		//Get the ordinal loss of each choice.
		for (let choice_id of choices) {
			let choice_rank = inputs["product"][set_label][choice_id];

			choice_ranks.push(choice_rank);
		}

		let set_adversity = choice_ranks.reduce((total, current) => total + current) / choices.length;
		sum_expected_ranks += set_adversity,
		sum_max_ranks += inputs["product"][set_label].filter(el => el.length > 0).length - 1;
	}
	
	return sum_expected_ranks / sum_max_ranks;
}
