CREATE TABLE requests (
	request_id bigserial PRIMARY KEY,
	request_date date,
	operator_title VARCHAR(255),
	operator_id int,
	operator_jurisdiction VARCHAR(255),
	operator_jurisdiction_id int,
	dateadded timestamp
);