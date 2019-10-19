When all data resides on a server, authentication and authorization are well-understood problems with lots of off-the-shelf solutions to choose from. The server acts as a gatekeeper between users and the data: If you don't have the correct credentials, the server just won't let you see data you're not allowed to see, or change it in unauthorized ways.

In a distributed architecture, where data is transmitted from peer to peer and there is no server acting as a central point of access, we'll need a different approach.

The purpose of this issue is to describe the problems of authentication and authorization in the context of Cevitxe's distributed collaboration framework, and specify the criteria that an acceptable solution must meet.

## Scenario

Alice has created a Cevitxe repository: a staff database for an organization that does clandestine work.

#### Sample data

| id     | first    | last      | jobTitle   | salary |
| ------ | -------- | --------- | ---------- | ------ |
| 123abc | Aldrich  | Ames      | Agent      | 88000  |
| 456qrs | Julius   | Rosenberg | Agent      | 77000  |
| 789stu | Mata     | Hari      | Manager    | 99000  |
| 777xyz | Jonathan | Pollard   | Mail Clerk | 66000  |
| 666gwb | Valerie  | Plame     | Agent      | 101000 |
| 987qed | George   | Smiley    | Agent      | 77000  |

#### Roles

Each actor belongs to one of these roles:

| Role             | Read                     | Write\*          | Admin |
| ---------------- | ------------------------ | ---------------- | :---: |
| hr               | all                      | all              |   ✔   |
| it               | all                      | all              |   ✔   |
| civilian-hr      | all but agents           | all              |       |
| civilian-manager | all but agents           | all but salaries |       |
| civilian         | all but agents, salaries | all              |       |
| auditor          | all                      | none             |       |
| connector        | all                      | all              |       |

\*An actor can only write data they can also read; in this column "all" really means "all visible".

#### Actors

| Actor            | Role             | Notes                    |
| ---------------- | ---------------- | ------------------------ |
| **Alice**        | hr               | created the repository   |
| **Bob**          | it               |                          |
| **Carol**        | auditor          |                          |
| **Dan**          | civilian         |                          |
| **Eve**          | (none)           | malicious external actor |
| **Frank**        | civilian-hr      |                          |
| **Gloria**       | civilian-manager |                          |
| **ImNotAServer** | connector        | always-on client         |

## Requirements

### Authentication

1. Authentication can be provided by a third party (e.g. OAuth2 via Google or GitHub).
2. An unknown actor like Eve should not be able to connect to the other actors at all.
3. For a new actor to access the dataset for the first time, they have to be online (obv).
4. Once an actor is authenticated, they can continue to use the same authentication token for N days, at which point it expires and they need to re-authenticate before they can synchronize with another actor.

### Authorization

1. **Administrative permissions:** Only roles marked as `admin` can modify permissions, including designating other roles as `admin`.

2. **Record-level permissions:** Some people work in civilian support roles, some work as secret agents. Agents' identities are very sensitive information: Their records should only be visible to users with the appropriate clearance.

   > For record-level permissions, not even the existence of the record should be divulged to actors that don't have read access to them. (For example, a civilian actor shouldn't even know how many agent records there are.)

3. **Field-level permissions:** Salary information is also sensitive, because the organization has not gone through the difficult but ultimately worthwhile process of salary transparency.

   > For field-level permissions, it's OK for actors without read access to know of the existence of the field. (For example, a non-hr actor can still know that a salary field exists, even if they can't see any of the values.)

4. An actor's permissions must be enforced whether or not they're online.

5. An admin can update permissions for any role at any time, including adding, removing, or modifying any of its specific authorizations. The updated permissions will be replicated to all other peers (immediately or the next time they connect) and will be enforced as soon as they are received.

6. An admin can change an actor's role at any time. That change will be replicated to all other peers (immediately or the next time they connect). The affected actor's new permissions will be enforced as soon as they receive them.

#### Examples

Using the above sample data along with the given roles, here's what some specific actors should see.

- Read-only data looks like _this_
- Encrypted data looks like ☒☒☒☒☒☒

##### Carol

As an auditor, Carol can see all data but can't edit any of it.

| id       | first      | last        | jobTitle     |    salary |
| -------- | ---------- | ----------- | ------------ | --------: |
| _123abc_ | _Aldrich_  | _Ames_      | _Agent_      |  _88,000_ |
| _456qrs_ | _Julius_   | _Rosenberg_ | _Agent_      |  _77,000_ |
| _789stu_ | _Mata_     | _Hari_      | _Manager_    |  _99,000_ |
| _777xyz_ | _Jonathan_ | _Pollard_   | _Mail Clerk_ |  _66,000_ |
| _666gwb_ | _Valerie_  | _Plame_     | _Agent_      | _101,000_ |
| _987qed_ | _George_   | _Smiley_    | _Agent_      |  _77,000_ |

##### Dan

As a civilian, Dan can't see anything about agents, and he can't see any salary information.

| id     | first    | last    | jobTitle   | salary |
| ------ | -------- | ------- | ---------- | -----: |
| 789stu | Mata     | Hari    | Manager    | ☒☒☒☒☒☒ |
| 777xyz | Jonathan | Pollard | Mail Clerk | ☒☒☒☒☒☒ |

##### Frank

As civilian HR, Frank can't see agents but can see and edit salary information.

| id     | first    | last    | jobTitle   | salary |
| ------ | -------- | ------- | ---------- | -----: |
| 789stu | Mata     | Hari    | Manager    | 99,000 |
| 777xyz | Jonathan | Pollard | Mail Clerk | 66,000 |

##### Gloria

As a civilian manager, Gloria can't see agents; she can see salaries but not change them.

| id     | first    | last    | jobTitle   | salary   |
| ------ | -------- | ------- | ---------- | -------- |
| 789stu | Mata     | Hari    | Manager    | _99,000_ |
| 777xyz | Jonathan | Pollard | Mail Clerk | _66,000_ |
