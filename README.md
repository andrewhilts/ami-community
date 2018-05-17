#AMI Community Tools

AMI Community Tools provides notification and statistical functionality to the overall AMI System.

##How it works
AMI Community Tools is primarily a JSON-based API that the AMI frontend interacts with. API endpoints are as follows:

**`POST /enroll`**: Saves statistics and consent to subscribe to email notifications, triggers sending of email address verification email.

**`GET /verify`**: Verifies a requester's email by matching up an email verfication token previously sent to the user with database records. Verified addresses are scheduled to receive jurisdiction event notifications.

**`POST /unsubscribe`**: Unsubscribes an email address from all notifications and deletes record of the email address entirely.

**`GET /stats/:method/:jurisdiction`**: Get statistics about requests by date, company, and total, for each jurisidiction.

A Cron job runs daily to send scheduled notifications to verified and subscribed email addresses. Emails are based on email templates that must be created for each jurisdiction event. See below for details.

##Initial Setup
Assuming that you've installed AMI Community Tools via [AMI Docker](https://github.com/citizenlab/ami-docker) build scripts, you should have the ami-community service running on Docker.

Once installed, some customization needs to be done to properly send notifications to AMI users.

###Jurisdiction Events
The foundation of AMI Community Tools' notification system is a concept called a jurisdiction event. Jurisdiction events are emails that are sent a specific number of days after a user has created a request in a particular jurisdiction.

For example, in Canada, one jurisdiction event might be to send a reminder to requesters 30 days after their request, asking if they've heard a response and providing helpful links if they haven't. After 60 days, another event might be an email with a survey link in it, asking for information about how the request process went.

To create events for a new jurisdiction, you'll have to create a new JSON file in the `jurisdiction_events` folder, with the naming convention `{{jurisdiction_id}}.json`, where `jurisdiction_id` is the ID of the jurisdiction in question in the AMI CMS.

Each jurisdiction event file should have the following properties:

*  `jurisdiction_id` set to the ID of the jurisdiction in question in the AMI CMS
*  `events`: an array of objects representing jurisdiction events.

Each event object should have the following properties:

*  `id` a single word key for the event
*  `name` a full name for the event
*  `description` a description of the event
*  `days_to_reminder` an integer denoting the number of days following the creation of a request record that the notification will be sent
*  `email_template` the filename prefix for the email template to use in the notification. See the email template section below.

Here is a full juridicition_events record, for Canada:

**18.json**

	{
		"jurisdiction_id": 18,
		"events": [
			{
				"id": "reminder",
				"name": "Check up on requester",
				"description": "This event sends a reminder email to the requester after the mandated period of time the operator has to respond has expired. Requester will be asked if they've gotten a response, sent a link to feedback form, or guidance on how to proceed if haven't gotten a response yet.",
				"days_to_reminder": 30,
				"email_template": "check-up"
			},
			{
				"id": "feedback",
				"name": "Solicit Feedback",
				"description": "Ask users for feedback if they haven't already provided it.",
				"days_to_reminder": 60,
				"email_template": "feedback"
			}
		]
	}

###Installing jurisdiction events
Once you've created your jurisdiction events file, you can install it by executing the following commands, where `node_version` and `webRoot` are the values set in your `host_vars` file (see [AMI System docs](https://github.com/andrewhilts/ami-system)), defaults are `5.10.1`, and `/var/www`, respectively.

	nvm use {{node_version}}
	cd {{webRoot}}/ami-community/database
	node install-events.js

**Note: This process should only be run once. If you run it again, you'll have duplicate events and users will get duplicate notifications (Bad!).**

###Updating jurisdiction events

If you need to add a new event for your jurisdiction after the initial install, or to edit an event, you'll have to do raw database queries, where `ami_community_dbname` is the value set in your `host_vars` file (see [AMI System docs](https://github.com/andrewhilts/ami-system)), default is `amicommunity`.

	sudo -u postgres psql {{ami_community_dbname}}

In the database, have a look at the events table:

	\d events;
	SELECT * FROM events;

Edit any records as you see fit. Apologies that db queries are needed here.

##Emails
The primary function of AMI Community Tools is to send emails to users who have opted-in to doing so. Email addresses are verified. People can unsubscribe. People get notifications when jurisdiction events relevant to their request occur.

###Sendgrid
Emails are send using a third party transactional email service called [Sendgrid](https://sendgrid.com/). You'll have to set up AMI Community Tools with your own API key with Sendgrid to be able to send emails. See the [AMI System documentation](https://github.com/andrewhilts/ami-system) for how to do this using Ansible. For most AMI deployments, the free Sendgrid service level of 12,000 emails per month should be more than enough.

###Subject Lines
Subject lines for various types of emails sent are defined in your Ansible `host_vars` file, per AMI System documentation, and subsequently hard-coded in the conf/lang settings files. 

###Email Templates
Email templates are used when sending out any email. Each email template is a folder following a specific naming convention, with an `html.handlebars`, and `text.handlebars` files inside.

Folders names have a single-word prefix, a hyphen, followed by a 2 word language code, another hyphen, then the jurisdiction ID. 

For example: `confirmation-en-18`

**This naming convention *must* be followed for the email templates to be found by the program.**

Within each email template folder, 2 files must exist: html.handlebars and text.handlebars

As the name indicates, the email template files use the [handlebars](http://handlebarsjs.com/) templating engine to populate the templates with variables (such as an unsubscribe link, the AMI logo, and more) when sending the message.

As the names of each file indicate, html.handlebars is used for HTML emails, while text.handlebars is for plaintext equivalents. Both are required.

#Statistics
The AMI Community tools provides basic statistical reporting about requests that have been saved to the system. Each report type is referred to as a `method` in the code. Below are the current methods:

*  `getTotal`: Get the total number of requests in a jurisdiction
*  `getVerified`: Get the total number of verified email addresses for requests in a jurisdiction
*  `getByCompany`: Get the total number of requests in a jurisdiction by data operator
*  `getByDate`: Get the total number of requests in a jurisdiction by day.

