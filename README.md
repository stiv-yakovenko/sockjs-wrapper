# Bank account application

Bank application uses MySQL to store data. Database schema
has three tables: persons, accounts, transfers. Each account
references to some person and each transfer references to some
account. Users table is initialised from users.json, its possible 
to add missing users on application restart. Tables are created if 
they were previously missing.

Transfer entry has following fields:
  comment -- string comment explaining transaction
  account_id -- represents account for the transaction
  debit -- positive if money are incoming
  credit -- positive if money are being withdrawn

In this case total money on account can be calculated as:

SELECT SUM(debit-credit) WHERE account_id = 123

So transferring 10$ from account 1 to 2 means adding 
two records like this to the database:
{account_id:1, debit:0,credit:10}
{account_id:2, debit:10,credit:0}

# Concurrency

We need to execute each transfer operation individually to avoid following use case:

Account 1 has balance of 1$. If we calculate balance twice for this account in two 
parralel threads and then move it to two other accounts, then this will lead to -1$, 
which is not what we want. So, second transfer should fail. For this each transaction should 
be executed strictly one by one with first balance SELECT blocking execution.

To solve concurrency problem I tried mysql FOR UPDATE syntax together with SERIALIZABLE transactions. 
But unfortunately this works in MySQL console, but doesn't work in nodejs. 

So I've decided to block at nodejs level and implemented class Isolator, which consumes tasks and
evaluates them one by one.

**UPDATE from 17.04.2017:** I've realised that it is possible to implement transfer as one big SQL operation of this kind:

INSERT INTO transfers(debit,credit,...) 

&nbsp; SELECT 0,amount ... FROM ... HAVING balance>0 AND amount<balance

UNION ALL

&nbsp; SELECT amount,0 ... FROM ... HAVING balance>0 AND amount<balance

HAVING and nested GROUP BY will allow to avoid inserting records if there is no enough money to transfer. 

# API

API is available through following HTTP GET requests on port 8080 
and returns JSON objects:
/new/1/23 -- create new account 456 with 23$, return JSON object: {accountId:456}
/transfers/123 -- show all transfers for account 123
/balance/123 -- get balance for account 123 as JSON object
/transfer/12/34/56 -- transfers 56$ from account 12 to 34

on error each function returns HTTP 403 and JSON with error message like this:
{error:"Wrong account"}

# Tests

test.js will test main cases: positive, incorrect parameters, wrong data 
and emulate concurrency situation, described above. 
  
# Future improvements

* research mysql issue and move blocking to db level
* use async module to reduce callback depth of /transfer handler.
* think about table indexes to improve db performance. 
* store calculated balance value inside accounts table to avoid seeking through table on each calculation.

# Authorisation

To implement authorisation I'd add special accounts with encrypted passwords to users table 
and add special authorisation url:

/auth/:email/:pass

which would return sid, which will get 