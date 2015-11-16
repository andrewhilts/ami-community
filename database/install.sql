CREATE TABLE requests (
	request_id bigserial PRIMARY KEY,
	request_date date,
	operator_title VARCHAR(255),
	operator_id int,
	operator_jurisdiction VARCHAR(255),
	operator_jurisdiction_id int,
	dateadded timestamp
);

CREATE TABLE contacts (
	email_address VARCHAR(255) PRIMARY KEY
);

CREATE TABLE events (
	event_id bigserial PRIMARY KEY,
	jurisdiction_id bigint,
	name VARCHAR(255),
	description TEXT,
	days_to_reminder bigint,
	CONSTRAINT u_constraint UNIQUE (name, jurisdiction_id)
);

CREATE TABLE request_contacts (
	email_address varchar(255) REFERENCES contacts(email_address) ON DELETE CASCADE,
	request_id bigint REFERENCES requests(request_id)
);

CREATE TABLE request_events (
	event_id bigint REFERENCES events(event_id),
	request_id bigint REFERENCES requests(request_id),
	email_sent BOOLEAN,
	email_schedule_date date
);