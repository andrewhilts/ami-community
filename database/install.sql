  CREATE TABLE requests (
	request_id bigserial PRIMARY KEY,
	request_date date,
	operator_title VARCHAR(255),
	operator_id int,
	operator_jurisdiction VARCHAR(255),
	operator_jurisdiction_id int,
	language CHAR(2)
	dateadded timestamp
);

CREATE TABLE request_services (
	request_service_id bigserial PRIMARY KEY,
	request_id bigint REFERENCES requests(request_id) ON DELETE CASCADE,
	service_id bigint
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
	email_subject VARCHAR(255),
	email_template VARCHAR(255),
	CONSTRAINT u_constraint UNIQUE (name, jurisdiction_id)
);

CREATE TABLE request_contacts (
	request_contact_id bigserial PRIMARY KEY,
	email_address varchar(255) REFERENCES contacts(email_address) ON DELETE CASCADE,
	request_id bigint REFERENCES requests(request_id),
	verification_token uuid,
	token_expiration_date date,
	verified BOOlEAN
);

CREATE TABLE request_events (
	request_event_id bigserial PRIMARY KEY,
	event_id bigint REFERENCES events(event_id),
	request_id bigint REFERENCES requests(request_id),
	request_contact_id bigint REFERENCES request_contacts(request_contact_id) ON DELETE CASCADE,
	email_sent BOOLEAN,
	email_schedule_date date
);
CREATE INDEX schedule_date ON request_events (email_schedule_date);

CREATE TABLE feedback_submissions (
	feedback_submission_id bigserial PRIMARY KEY,
	feedback_submission_date timestamp
);

CREATE TABLE feedback_submission_items (
	feedback_submission_item_id bigserial PRIMARY KEY,
	feedback_submission_id bigint REFERENCES feedback_submissions(feedback_submission_id) ON DELETE CASCADE,
	feedback_item_label VARCHAR(255),
	int_value int,
	text_value TEXT
);