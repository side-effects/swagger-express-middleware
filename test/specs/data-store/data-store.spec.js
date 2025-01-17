"use strict";

const { expect } = require("chai");
const { helper, createTempDir } = require("../../utils");
const { Resource, DataStore, MemoryDataStore, FileDataStore } = require("../../../");

describe.skip("DataStore", () => {
  // All of these tests should pass for all DataStore classes
  [FileDataStore, MemoryDataStore].forEach((DataStoreClass) => {
    describe(DataStoreClass.name, () => {

      beforeEach((done) => {
        if (DataStoreClass === FileDataStore) {
          // Create a temp directory, and chdir to it
          createTempDir((temp) => {
            process.chdir(temp);
            done();
          });
        }
        else {
          done();
        }
      });

      it("should inherit from DataStore", () => {
        let dataStore = new DataStoreClass();
        expect(dataStore).to.be.an.instanceOf(DataStore);
      });

      describe("get method", () => {
        it("should be able to save and retrieve a resource", (done) => {
          let dataStore = new DataStoreClass();
          let resource = new Resource("/users/JDoe", { name: "John Doe" });

          dataStore.save(resource, () => {
            dataStore.get(resource, (err, retrieved) => {
              if (err) {
                return done(err);
              }
              expect(retrieved).to.deep.equal(resource);     // value equality
              expect(retrieved).not.to.equal(resource);      // not reference equality
              done();
            });
          });
        });

        it("should be able to update and retrieve a resource", (done) => {
          let dataStore = new DataStoreClass();
          let resource = new Resource("/users/JDoe", { name: "John Doe" });

          dataStore.save(resource, () => {
            // Update the resource and save it again
            let updatedResource = new Resource("/users/JDoe", { name: "Bob Smith" });
            dataStore.save(updatedResource, () => {
              // Retrieve the updated resource
              dataStore.get(resource, (err, retrieved) => {
                if (err) {
                  return done(err);
                }

                // It should no longer match the original data
                expect(retrieved).not.to.deep.equal(resource);
                expect(retrieved).not.to.equal(resource);

                // But should match the updated data
                expect(retrieved).to.deep.equal(updatedResource);     // value equality
                expect(retrieved).not.to.equal(updatedResource);      // not reference equality

                done();
              });
            });
          });
        });

        it("should be able to retrieve a resource by path", (done) => {
          let dataStore = new DataStoreClass();
          let resource = new Resource("/users/JDoe", { name: "John Doe" });

          dataStore.save(resource, () => {
            dataStore.get("/users/JDoe", (err, retrieved) => {
              if (err) {
                return done(err);
              }
              expect(retrieved).to.deep.equal(resource);     // value equality
              expect(retrieved).not.to.equal(resource);      // not reference equality
              done();
            });
          });
        });

        it("should return undefined if no resource is found", (done) => {
          let dataStore = new DataStoreClass();
          let retrieved = new Resource("/users", "/JDoe");

          dataStore.get(retrieved, (err, retrieved) => {
            if (err) {
              return done(err);
            }
            expect(retrieved).to.be.undefined;
            done();
          });
        });

        it("should be able to retrieve a resource using normalized collection path", (done) => {
          let dataStore = new DataStoreClass();

          // Save the data using a non-normalized collection path
          let saved = new Resource("users/", "JDoe/", { name: "John Doe" });

          // Retrieve the data using a normalized collection path
          let retrieved = new Resource("/users", "/jdoe", null);

          dataStore.save(saved, () => {
            dataStore.get(retrieved, (err, retrieved) => {
              if (err) {
                return done(err);
              }
              expect(retrieved).to.deep.equal(saved);     // value equality
              expect(retrieved).not.to.equal(saved);      // not reference equality
              done();
            });
          });
        });

        it("should be able to retrieve a resource using a non-normalized collection path", (done) => {
          let dataStore = new DataStoreClass();

          // Save the data using a normalized collection path
          let saved = new Resource("/users", "/jdoe", { name: "John Doe" });

          // Retrieve the data using a non-normalized collection path
          let retrieved = new Resource("users/", "JDoe/", null);

          dataStore.save(saved, () => {
            dataStore.get(retrieved, (err, retrieved) => {
              if (err) {
                return done(err);
              }
              expect(retrieved).to.deep.equal(saved);     // value equality
              expect(retrieved).not.to.equal(saved);      // not reference equality
              done();
            });
          });
        });

        it("should be able to retrieve a resource using normalized resource name", (done) => {
          let dataStore = new DataStoreClass();

          // Save the data using a non-normalized resource name
          let saved = new Resource("/users/", "/JDoe/", { name: "John Doe" });

          // Retrieve the data using a normalized resource name
          let retrieved = new Resource("/users", "/jdoe", null);

          dataStore.save(saved, () => {
            dataStore.get(retrieved, (err, retrieved) => {
              if (err) {
                return done(err);
              }
              expect(retrieved).to.deep.equal(saved);     // value equality
              expect(retrieved).not.to.equal(saved);      // not reference equality
              done();
            });
          });
        });

        it("should be able to retrieve a resource using a non-normalized resource name", (done) => {
          let dataStore = new DataStoreClass();

          // Save the data using a normalized resource name
          let saved = new Resource("/users", "/jdoe/", { name: "John Doe" });

          // Retrieve the data using a non-normalized resource name
          let retrieved = new Resource("/users/", "JDoe/", null);

          dataStore.save(saved, () => {
            dataStore.get(retrieved, (err, retrieved) => {
              if (err) {
                return done(err);
              }
              expect(retrieved).to.deep.equal(saved);     // value equality
              expect(retrieved).not.to.equal(saved);      // not reference equality
              done();
            });
          });
        });

        it("should be able to retrieve a case-sensitive resource", (done) => {
          let dataStore = new DataStoreClass();
          dataStore.__router = helper.express();
          dataStore.__router.enable("case sensitive routing");

          let res1 = new Resource("/users", "/JDoe", { name: "John Doe 1" });
          let res2 = new Resource("/UsErS", "jdoe", { name: "John Doe 2" });
          let res3 = new Resource("/Users/", "/JDOE/", { name: "John Doe 3" });

          // Case-sensitive.  Non-Strict
          let retrieved = new Resource("UsErS/jdoe/");

          dataStore.save(res1, () => {
            dataStore.save(res2, () => {
              dataStore.save(res3, () => {
                dataStore.get(retrieved, (err, retrieved) => {
                  if (err) {
                    return done(err);
                  }
                  expect(retrieved).to.deep.equal(res2);     // value equality
                  expect(retrieved).not.to.equal(res2);      // not reference equality
                  done();
                });
              });
            });
          });
        });

        it("should be able to retrieve a strict resource", (done) => {
          let dataStore = new DataStoreClass();
          dataStore.__router = helper.express();
          dataStore.__router.enable("strict routing");

          let res1 = new Resource("/users", "/JDoe", { name: "John Doe 1" });
          let res2 = new Resource("/UsErS", "jdoe", { name: "John Doe 2" });
          let res3 = new Resource("/Users/", "/JDOE/", { name: "John Doe 3" });

          // Case-insensitive.  Strict
          let retrieved = new Resource("/USERS/jdoe/");

          dataStore.save(res1, () => {
            dataStore.save(res2, () => {
              dataStore.save(res3, () => {
                dataStore.get(retrieved, (err, retrieved) => {
                  if (err) {
                    return done(err);
                  }
                  expect(retrieved).to.deep.equal(res3);     // value equality
                  expect(retrieved).not.to.equal(res3);      // not reference equality
                  done();
                });
              });
            });
          });
        });

        it("should be able to retrieve a strict, case-sensitive resource", (done) => {
          let dataStore = new DataStoreClass();
          dataStore.__router = helper.express();
          dataStore.__router.enable("case sensitive routing");
          dataStore.__router.enable("strict routing");

          let res1 = new Resource("/users", "/JDoe", { name: "John Doe 1" });
          let res2 = new Resource("/UsErS", "jdoe", { name: "John Doe 2" });
          let res3 = new Resource("/Users/", "/JDOE/", { name: "John Doe 3" });

          // Case-sensitive.  Strict
          let retrieved = new Resource("UsErS/jdoe");

          dataStore.save(res1, () => {
            dataStore.save(res2, () => {
              dataStore.save(res3, () => {
                dataStore.get(retrieved, (err, retrieved) => {
                  if (err) {
                    return done(err);
                  }
                  expect(retrieved).to.deep.equal(res2);     // value equality
                  expect(retrieved).not.to.equal(res2);      // not reference equality
                  done();
                });
              });
            });
          });
        });

        it("should return an error if data cannot be parsed", (done) => {
          let dataStore = new DataStoreClass();
          let saved = new Resource("/users", "/JDoe", { name: "John Doe 1" });
          let retrieved = new Resource("/users", "/JDoe", null);
          let error = null;

          // This will cause a parsing error
          saved.name = "foo/bar/baz";

          dataStore.save(saved, (err) => {
            error = err;

            dataStore.get(retrieved, (err, retrieved) => {
              // Depending on the implementation, the error may occur during saving or retrieving
              error = error || err;

              expect(error).to.be.an.instanceOf(Error);
              expect(error.message).to.contain("Resource names cannot contain slashes");
              done();
            });
          });
        });

        it("should throw an error if not called with a Resource object", () => {
          function throws () {
            dataStore.get(Object.assign({}, new Resource()));
          }

          let dataStore = new DataStoreClass();
          expect(throws).to.throw(Error, "Expected a string or Resource object. Got a object instead.");
        });

        it("can be called without a callback", () => {
          let dataStore = new DataStoreClass();
          dataStore.get(new Resource());
        });
      });

      describe("save method (single resource)", () => {
        it("should set the createdOn and modifiedOn properties when saved", (done) => {
          let dataStore = new DataStoreClass();
          let resource = new Resource("/users/JDoe", { name: "John Doe" });
          let now = new Date(Date.now() - 5); // 5 milliseconds ago

          // The timestamps are null to start out with
          expect(resource.createdOn).to.be.null;
          expect(resource.modifiedOn).to.be.null;

          // I can set them if I want
          resource.createdOn = new Date(2010, 5, 8);
          resource.modifiedOn = new Date(2011, 9, 10);
          expect(resource.createdOn).to.equalTime(new Date(2010, 5, 8));
          expect(resource.modifiedOn).to.equalTime(new Date(2011, 9, 10));

          // When I save the resource, both dates will be set, since it's a new resource
          dataStore.save(resource, (err, saved) => {
            expect(saved).to.equal(resource);
            expect(saved.createdOn).to.be.afterTime(now);
            expect(saved.modifiedOn).to.equalTime(saved.createdOn);

            // Make sure the dates were persisted
            dataStore.get(resource, (err, retrieved) => {
              if (err) {
                return done(err);
              }
              expect(retrieved.createdOn).to.equalTime(saved.createdOn);
              expect(retrieved.modifiedOn).to.equalTime(saved.modifiedOn);
              done();
            });
          });
        });

        it("should update modifiedOn when a resource is updated", (done) => {
          let dataStore = new DataStoreClass();
          let resource = new Resource("/users/JDoe", { name: "John Doe" });

          // Save the resource
          dataStore.save(resource, () => {
            // Update the resource (after a few ticks)
            setTimeout(() => {
              let updatedResource = new Resource("/users/JDoe");
              dataStore.save(updatedResource, (err, saved) => {
                // The modifiedOn should have changed.  The createdOn should NOT have changed.
                expect(saved).to.equal(updatedResource);
                expect(saved.createdOn).to.equalTime(resource.createdOn);
                expect(saved.modifiedOn).not.to.equalTime(resource.modifiedOn);
                expect(saved.modifiedOn).to.be.afterTime(resource.modifiedOn);

                // Make sure the updated dates were persisted
                dataStore.get(resource, (err, retrieved) => {
                  if (err) {
                    return done(err);
                  }
                  expect(retrieved.createdOn).to.equalTime(saved.createdOn);
                  expect(retrieved.modifiedOn).to.equalTime(saved.modifiedOn);
                  done();
                });
              });
            }, 1000);
          });
        });

        it("should merge with the existing resource", (done) => {
          let dataStore = new DataStoreClass();
          let resource = new Resource("/users/JDoe", {
            name: {
              first: "John",
              last: "Doe",
              suffixes: {
                mr: true,
                ms: false
              }
            },
            dob: new Date(Date.UTC(1980, 5, 22)),
            age: 42,
            favoriteColors: ["red", "blue"],
            address: {
              street: "123 First St.",
              city: "Portland",
              state: "OR"
            }
          });

          dataStore.save(resource, () => {
            let updatedResource = new Resource("/users/JDoe", {
              name: {
                first: "Bob",
                suffixes: {
                  dr: true,
                  mrs: false
                }
              },
              dob: new Date(Date.UTC(2000, 1, 2)),
              age: 99,
              favoriteColors: ["yellow"]
            });

            dataStore.save(updatedResource, () => {
              dataStore.get(resource, (err, retrieved) => {
                expect(retrieved.data).to.deep.equal({
                  name: {
                    first: "Bob",
                    last: "Doe",
                    suffixes: {
                      mr: true,
                      ms: false,
                      dr: true,
                      mrs: false
                    }
                  },
                  dob: "2000-02-02T00:00:00.000Z",
                  age: 99,
                  favoriteColors: ["yellow", "blue"],
                  address: {
                    street: "123 First St.",
                    city: "Portland",
                    state: "OR"
                  }
                });
                done(err);
              });
            });
          });
        });

        it("should merge with the existing resource array", (done) => {
          let dataStore = new DataStoreClass();
          let resource = new Resource("/users/BSmith", [1, "two", { number: "three" }, 4, [5]]);

          dataStore.save(resource, () => {
            let updatedResource = new Resource("/users/BSmith", ["one", 2, { three: true }]);

            dataStore.save(updatedResource, () => {
              dataStore.get(resource, (err, retrieved) => {
                expect(retrieved.data).to.deep.equal(["one", 2, { three: true, number: "three" }, 4, [5]]);
                done(err);
              });
            });
          });
        });

        it("should overwrite an empty resource", (done) => {
          let dataStore = new DataStoreClass();

          // Save an empty resource
          let resource = new Resource("/users/JDoe");
          dataStore.save(resource, () => {
            // Now add data
            let updatedResource = new Resource("/users/JDoe", { name: "John Doe" });
            dataStore.save(updatedResource, () => {
              // The data should have replaced the empty resource
              dataStore.get(resource, (err, retrieved) => {
                expect(retrieved.data).to.deep.equal({ name: "John Doe" });
                done(err);
              });
            });
          });
        });

        it("should overwrite a resource with an empty value", (done) => {
          let dataStore = new DataStoreClass();

          // Save a number resource
          let resource = new Resource("/users/JDoe", 42);
          dataStore.save(resource, () => {
            // Overwrite it with an empty value
            let updatedResource = new Resource("/users/JDoe");
            dataStore.save(updatedResource, () => {
              // The resource should now be empty
              dataStore.get(resource, (err, retrieved) => {
                expect(retrieved.data).to.be.undefined;
                done(err);
              });
            });
          });
        });

        it("should overwrite a simple resource with an object resource", (done) => {
          let dataStore = new DataStoreClass();

          // Save a number resource
          let resource = new Resource("/users/JDoe", 42);
          dataStore.save(resource, () => {
            // Overwrite it with an object resource
            let updatedResource = new Resource("/users/JDoe", { name: "John Doe" });
            dataStore.save(updatedResource, () => {
              // The data should have replaced the empty resource
              dataStore.get(resource, (err, retrieved) => {
                expect(retrieved.data).to.deep.equal({ name: "John Doe" });
                done(err);
              });
            });
          });
        });

        it("should overwrite an object resource with a simple resource", (done) => {
          let dataStore = new DataStoreClass();

          // Save an object resource
          let resource = new Resource("/users/JDoe", { name: "John Doe" });
          dataStore.save(resource, () => {
            // Overwrite it with a simple resource
            let updatedResource = new Resource("/users/JDoe", "hello world");
            dataStore.save(updatedResource, () => {
              // The resource should now be a string
              dataStore.get(resource, (err, retrieved) => {
                expect(retrieved.data).to.equal("hello world");
                done(err);
              });
            });
          });
        });

        it("should throw an error if not called with a Resource object", () => {
          function throws () {
            dataStore.save(Object.assign({}, new Resource()));
          }

          let dataStore = new DataStoreClass();
          expect(throws).to.throw(Error, "Expected a Resource object, but parameter 1 is a object.");
        });

        it("can be called without a callback", () => {
          let dataStore = new DataStoreClass();
          dataStore.save(new Resource());
        });
      });

      describe("save method (multiple resources)", () => {
        it("should return an empty array if no resources are saved", (done) => {
          let dataStore = new DataStoreClass();

          dataStore.save([], (err, saved) => {
            if (err) {
              return done(err);
            }
            expect(saved).to.have.lengthOf(0);
            done();
          });
        });

        it("should save new resources", (done) => {
          let dataStore = new DataStoreClass();
          let res1 = new Resource("users", "JDoe", { name: "John Doe" });
          let res2 = new Resource("/USERS/", "/BSmith/", { name: "Bob Smith" });
          let res3 = new Resource("/Users/SConnor", { name: "Sarah Connor" });

          // Save the resources
          dataStore.save(res1, [res2], res3, (err, saved) => {
            expect(saved).to.have.same.members([res1, res2, res3]);

            // Verify that the resources were persisted
            dataStore.getCollection("users", (err, retrieved) => {
              expect(retrieved).not.to.equal(saved);
              expect(retrieved).to.have.same.deep.members(saved);
              done();
            });
          });
        });

        it("should add new resources to an existing collection", (done) => {
          let dataStore = new DataStoreClass();
          let res1 = new Resource("users", "JDoe", { name: "John Doe" });
          let res2 = new Resource("/Users/", "/BSmith/", { name: "Bob Smith" });

          // Save the original resources
          dataStore.save(res1, res2, (err, saved) => {
            // Add more resources
            let res3 = new Resource("uSeRs", "SConnor", { name: "Sarah Connor" });
            let res4 = new Resource("/USERS/BBob", { name: "Billy Bob" });

            dataStore.save([res3, res4], (err, saved) => {
              expect(saved).to.have.same.deep.members([res3, res4]);

              // Verify that the resources were persisted
              dataStore.getCollection("users", (err, retrieved) => {
                expect(retrieved).to.have.same.deep.members([res1, res2, res3, res4]);
                done();
              });
            });
          });
        });

        it("should merge resources with an existing collection", (done) => {
          let dataStore = new DataStoreClass();
          let res1 = new Resource("users", "JDoe", { name: "John Doe" });
          let res2 = new Resource("/Users/", "/BSmith/", { name: "Bob Smith" });
          let res3 = new Resource("/USERS", "SConnor", { name: "Sarah Connor" });

          // Save the original resources
          dataStore.save([res1, res2], res3, (err, saved) => {
            // Add/update resources
            let res4 = new Resource("UsErS/BSmith", { name: "Barbra Smith" });    // <-- Barbara replaces Bob
            let res5 = new Resource("/users/BBob", { name: "Billy Bob" });

            dataStore.save([res4], [res5], (err, saved) => {
              expect(saved).to.have.same.deep.members([res4, res5]);

              // Verify that the resources were persisted
              dataStore.getCollection("users", (err, retrieved) => {
                expect(retrieved).to.have.same.deep.members([res1, res3, res4, res5]);
                done();
              });
            });
          });
        });

        it("should merge duplicate resources", (done) => {
          let dataStore = new DataStoreClass();

          let res1 = new Resource("/users/JDoe", { name: "John Doe 1" });
          let res2 = new Resource("/users/JDoe/", { name: "John Doe 2" });
          let res3 = new Resource("/Users/JDoe", { name: "John Doe 3" });
          let res4 = new Resource("/users/jdoe", { name: "John Doe 4" });
          let res5 = new Resource("/users/jdoe/", { name: "John Doe 5" });

          dataStore.save(res1, res2, res3, res4, res5, (err, saved) => {
            if (err) {
              return done(err);
            }
            expect(saved).to.have.same.members([res1, res2, res3, res4, res5]);
            expect(res1.data).to.equal(res2.data);
            expect(res1.data).to.equal(res3.data);
            expect(res1.data).to.equal(res4.data);
            expect(res1.data).to.equal(res5.data);

            // Verify that only one record was saved
            dataStore.getCollection("/Users", (err, retrieved1) => {
              if (err) {
                return done(err);
              }
              expect(retrieved1).to.have.lengthOf(1);
              expect(retrieved1[0]).to.deep.equal(res5);     // value equality
              expect(retrieved1[0]).not.to.equal(res5);      // not reference equality

              dataStore.getCollection("/users", (err, retrieved2) => {
                if (err) {
                  return done(err);
                }
                expect(retrieved2).to.have.lengthOf(1);
                expect(retrieved2).not.to.equal(retrieved1);
                expect(retrieved2).to.have.same.deep.members(retrieved1);
                done();
              });
            });
          });
        });

        it("should save strict, case-sensitive resources", (done) => {
          let dataStore = new DataStoreClass();
          dataStore.__router = helper.express();
          dataStore.__router.enable("case sensitive routing");
          dataStore.__router.enable("strict routing");

          let res1 = new Resource("/users/JDoe", { name: "John Doe 1" });
          let res2 = new Resource("/users/JDoe/", { name: "John Doe 2" });
          let res3 = new Resource("/Users/JDoe", { name: "John Doe 3" });
          let res4 = new Resource("/users/jdoe", { name: "John Doe 4" });
          let res5 = new Resource("/users/jdoe/", { name: "John Doe 5" });

          dataStore.save(res1, res2, res3, res4, res5, () => {
            // Verify that all of the records were saved
            dataStore.getCollection("/Users", (err, retrieved) => {
              if (err) {
                return done(err);
              }
              expect(retrieved).to.have.lengthOf(1);
              expect(retrieved[0]).to.deep.equal(res3);     // value equality
              expect(retrieved[0]).not.to.equal(res3);      // not reference equality

              dataStore.getCollection("/users", (err, retrieved) => {
                if (err) {
                  return done(err);
                }
                expect(retrieved).to.have.lengthOf(4);
                expect(retrieved[0]).to.deep.equal(res1);     // value equality
                expect(retrieved[0]).not.to.equal(res1);      // not reference equality
                expect(retrieved[1]).to.deep.equal(res2);     // value equality
                expect(retrieved[1]).not.to.equal(res2);      // not reference equality
                expect(retrieved[2]).to.deep.equal(res4);     // value equality
                expect(retrieved[2]).not.to.equal(res4);      // not reference equality
                expect(retrieved[3]).to.deep.equal(res5);     // value equality
                expect(retrieved[3]).not.to.equal(res5);      // not reference equality
                done();
              });
            });
          });
        });

        it("should throw an error if not called with an array of Resources", () => {
          function throws () {
            dataStore.save(new Resource(), [new Resource(), Object.assign({}, new Resource())]);
          }

          let dataStore = new DataStoreClass();
          expect(throws).to.throw(Error, "Expected a Resource object, but parameter 3 is a object.");
        });

        it("can be called without a callback", () => {
          let dataStore = new DataStoreClass();
          dataStore.save(new Resource(), new Resource());
        });
      });

      describe("delete method (single resource)", () => {
        it('should be aliased as "remove"', () => {
          let dataStore = new DataStoreClass();
          expect(dataStore.delete).to.equal(dataStore.remove);
        });

        it("should return undefined if no resource is deleted", (done) => {
          let dataStore = new DataStoreClass();
          let deleted = new Resource("/users/JDoe");

          dataStore.delete(deleted, (err, deleted) => {
            if (err) {
              return done(err);
            }
            expect(deleted).to.be.undefined;
            done();
          });
        });

        it("deleted items should not be returned later", (done) => {
          let dataStore = new DataStoreClass();
          let saved = new Resource("/users/JDoe", { name: "John Doe" });
          let deleted = new Resource("/users", "/jdoe", undefined);

          dataStore.save(saved, () => {
            dataStore.delete(deleted, (err, deleted) => {
              if (err) {
                return done(err);
              }
              expect(deleted).to.deep.equal(saved);     // value equality
              expect(deleted).not.to.equal(saved);      // not reference equality

              // Verify that the data was deleted
              dataStore.get(deleted, (err, retrieved) => {
                if (err) {
                  return done(err);
                }
                expect(retrieved).to.be.undefined;
                done();
              });
            });
          });
        });

        it("deleted items should not be returned later by collection", (done) => {
          let dataStore = new DataStoreClass();
          let saved = new Resource("/users/JDoe", { name: "John Doe" });
          let deleted = new Resource("/users", "/jdoe", undefined);

          dataStore.save(saved, () => {
            dataStore.delete(deleted, (err, deleted) => {
              if (err) {
                return done(err);
              }
              expect(deleted).to.deep.equal(saved);     // value equality
              expect(deleted).not.to.equal(saved);      // not reference equality

              // Verify that the data was deleted
              dataStore.getCollection("/users", (err, retrieved) => {
                if (err) {
                  return done(err);
                }
                expect(retrieved).to.have.lengthOf(0);
                done();
              });
            });
          });
        });

        it("should be able to delete a resource using normalized values", (done) => {
          let dataStore = new DataStoreClass();

          // Save the data using a non-normalized values
          let saved = new Resource("/users/JDoe", { name: "John Doe" });

          // Delete the data using a normalized values
          let deleted = new Resource("/users", "/jdoe", undefined);

          dataStore.save(saved, () => {
            dataStore.delete(deleted, (err, deleted) => {
              if (err) {
                return done(err);
              }
              expect(deleted).to.deep.equal(saved);     // value equality
              expect(deleted).not.to.equal(saved);      // not reference equality

              // Verify that the data was deleted
              dataStore.getCollection("/users", (err, retrieved) => {
                if (err) {
                  return done(err);
                }
                expect(retrieved).to.have.lengthOf(0);
                done();
              });
            });
          });
        });

        it("should be able to delete a resource using non-normalized values", (done) => {
          let dataStore = new DataStoreClass();

          // Save the data using a normalized values
          let saved = new Resource("/users", "/jdoe", { name: "John Doe" });

          // Delete the data using a non-normalized values
          let deleted = new Resource("Users/", "JDoe/", undefined);

          dataStore.save(saved, () => {
            dataStore.delete(deleted, (err, deleted) => {
              if (err) {
                return done(err);
              }
              expect(deleted).to.deep.equal(saved);     // value equality
              expect(deleted).not.to.equal(saved);      // not reference equality

              // Verify that the data was deleted
              dataStore.getCollection("/users", (err, retrieved) => {
                if (err) {
                  return done(err);
                }
                expect(retrieved).to.have.lengthOf(0);
                done();
              });
            });
          });
        });

        it("should be able to delete a strict, case-sensitive resource", (done) => {
          let dataStore = new DataStoreClass();
          dataStore.__router = helper.express();
          dataStore.__router.enable("case sensitive routing");
          dataStore.__router.enable("strict routing");

          let res1 = new Resource("/users", "/JDoe", { name: "John Doe 1" });
          let res2 = new Resource("/UsErS", "jdoe", { name: "John Doe 2" });
          let res3 = new Resource("/Users/", "/JDOE/", { name: "John Doe 3" });

          // Case-sensitive.  Strict
          let retrieved = new Resource("UsErS/", "/jdoe", undefined);

          dataStore.save(res1, () => {
            dataStore.save(res2, () => {
              dataStore.save(res3, () => {
                dataStore.delete(retrieved, (err, deleted) => {
                  if (err) {
                    return done(err);
                  }
                  expect(deleted).to.deep.equal(res2);     // value equality
                  expect(deleted).not.to.equal(res2);      // not reference equality

                  // Verify that the data was deleted
                  dataStore.getCollection("/UsErS", (err, retrieved) => {
                    if (err) {
                      return done(err);
                    }
                    expect(retrieved).to.have.lengthOf(0);
                    done();
                  });
                });
              });
            });
          });
        });

        it("should throw an error if not called with a Resource object", () => {
          function throws () {
            dataStore.delete(Object.assign({}, new Resource()));
          }

          let dataStore = new DataStoreClass();
          expect(throws).to.throw(Error, "Expected a Resource object, but parameter 1 is a object.");
        });

        it("can be called without a callback", () => {
          let dataStore = new DataStoreClass();
          dataStore.delete(new Resource());
        });
      });

      describe("delete method (multiple resources)", () => {
        it("should return an empty array if no resources are deleted", (done) => {
          let dataStore = new DataStoreClass();

          dataStore.delete([], (err, deleted) => {
            if (err) {
              return done(err);
            }
            expect(deleted).to.have.lengthOf(0);
            done();
          });
        });

        it("should return an empty array if no resources matched", (done) => {
          let dataStore = new DataStoreClass();
          let saved = new Resource("/users/JDoe", { name: "John Doe" });
          let del1 = new Resource("/users/BSmith");
          let del2 = new Resource("/users/SConnor");

          dataStore.save(saved, () => {
            dataStore.delete(del1, del2, (err, deleted) => {
              if (err) {
                return done(err);
              }
              expect(deleted).to.have.lengthOf(0);
              done();
            });
          });
        });

        it("should return undefined if the only resource was not matched", (done) => {
          let dataStore = new DataStoreClass();
          let saved = new Resource("/users/JDoe", { name: "John Doe" });
          let del1 = new Resource("/users/BSmith");

          dataStore.save(saved, () => {
            dataStore.delete(del1, (err, deleted) => {
              if (err) {
                return done(err);
              }
              expect(deleted).to.be.undefined;
              done();
            });
          });
        });

        it("should delete multiple resources from a collection", (done) => {
          let dataStore = new DataStoreClass();
          let res1 = new Resource("/users", "/JDoe", { name: "John Doe" });
          let res2 = new Resource("/UsErS", "/BSmith", { name: "Bob Smith" });
          let res3 = new Resource("/Users/", "/SConnor", { name: "Sarah Connor" });
          let res4 = new Resource("/Users/", "/JConnor", { name: "John Connor" });

          dataStore.save(res1, [res2, res3], res3, res4, () => {
            dataStore.delete(res2, res4, (err, deleted) => {
              if (err) {
                return done(err);
              }
              expect(deleted).to.have.lengthOf(2);

              // Order should be retained
              expect(deleted[0]).to.deep.equal(res2);     // value equality
              expect(deleted[0]).not.to.equal(res2);      // not reference equality
              expect(deleted[1]).to.deep.equal(res4);     // value equality
              expect(deleted[1]).not.to.equal(res4);      // not reference equality

              // Verify that the records were deleted
              dataStore.getCollection("/Users", (err, retrieved) => {
                if (err) {
                  return done(err);
                }
                expect(retrieved).to.have.lengthOf(2);

                // Order should be retained
                expect(retrieved[0]).to.deep.equal(res1);     // value equality
                expect(retrieved[0]).not.to.equal(res1);      // not reference equality
                expect(retrieved[1]).to.deep.equal(res3);     // value equality
                expect(retrieved[1]).not.to.equal(res3);      // not reference equality

                done();
              });
            });
          });
        });

        it("should only delete strict, case-sensitive resources", (done) => {
          let dataStore = new DataStoreClass();
          dataStore.__router = helper.express();
          dataStore.__router.enable("case sensitive routing");
          dataStore.__router.enable("strict routing");

          let res1 = new Resource("/users/JDoe", { name: "John Doe 1" });
          let res2 = new Resource("/users/JDoe/", { name: "John Doe 2" });
          let res3 = new Resource("/Users/JDoe", { name: "John Doe 3" });
          let res4 = new Resource("/users/jdoe", { name: "John Doe 4" });
          let res5 = new Resource("/users/jdoe/", { name: "John Doe 5" });

          dataStore.save(res1, res2, res3, res4, res5, () => {
            dataStore.delete([res1, res5], (err, deleted) => {
              if (err) {
                return done(err);
              }
              expect(deleted).to.have.lengthOf(2);

              // Order should be retained
              expect(deleted[0]).to.deep.equal(res1);     // value equality
              expect(deleted[0]).not.to.equal(res1);      // not reference equality
              expect(deleted[1]).to.deep.equal(res5);     // value equality
              expect(deleted[1]).not.to.equal(res5);      // not reference equality

              // Verify that the records were deleted
              dataStore.getCollection("/Users", (err, retrieved) => {
                if (err) {
                  return done(err);
                }
                expect(retrieved).to.have.lengthOf(1);
                expect(retrieved[0]).to.deep.equal(res3);     // value equality
                expect(retrieved[0]).not.to.equal(res3);      // not reference equality

                // Verify that other records were NOT deleted
                dataStore.getCollection("/users", (err, retrieved) => {
                  if (err) {
                    return done(err);
                  }
                  expect(retrieved).to.have.lengthOf(2);
                  expect(retrieved[0]).to.deep.equal(res2);     // value equality
                  expect(retrieved[0]).not.to.equal(res2);      // not reference equality
                  expect(retrieved[1]).to.deep.equal(res4);     // value equality
                  expect(retrieved[1]).not.to.equal(res4);      // not reference equality
                  done();
                });
              });
            });
          });
        });

        it("should throw an error if not called with an array of Resources", () => {
          function throws () {
            dataStore.delete(new Resource(), [new Resource(), Object.assign({}, new Resource())]);
          }

          let dataStore = new DataStoreClass();
          expect(throws).to.throw(Error, "Expected a Resource object, but parameter 3 is a object.");
        });

        it("can be called without a callback", () => {
          let dataStore = new DataStoreClass();
          dataStore.delete(new Resource(), new Resource());
        });
      });

      describe("getCollection", () => {
        it("should return an empty array if no resources are found", (done) => {
          let dataStore = new DataStoreClass();

          dataStore.getCollection("/foo/bar/baz", (err, retrieved) => {
            if (err) {
              return done(err);
            }
            expect(retrieved).to.have.lengthOf(0);
            done();
          });
        });

        it("should retrieve an array of one resource", (done) => {
          let dataStore = new DataStoreClass();
          let saved = new Resource("/users/JDoe", { name: "John Doe" });

          dataStore.save(saved, () => {
            dataStore.getCollection("/Users", (err, retrieved) => {
              if (err) {
                return done(err);
              }
              expect(retrieved).to.have.lengthOf(1);
              expect(retrieved[0]).to.deep.equal(saved);     // value equality
              expect(retrieved[0]).not.to.equal(saved);      // not reference equality
              done();
            });
          });
        });

        it("should retrieve an array of multiple resources", (done) => {
          let dataStore = new DataStoreClass();
          let res1 = new Resource("/users/JDoe", { name: "John Doe" });
          let res2 = new Resource("/UsErS/BSmith", { name: "Bob Smith" });
          let res3 = new Resource("/Users/SConnor", { name: "Sarah Connor" });

          dataStore.save(res1, res2, res3, () => {
            dataStore.getCollection("Users", (err, retrieved) => {
              if (err) {
                return done(err);
              }
              expect(retrieved).to.have.lengthOf(3);

              // Order should be retained
              expect(retrieved[0]).to.deep.equal(res1);     // value equality
              expect(retrieved[0]).not.to.equal(res1);      // not reference equality
              expect(retrieved[1]).to.deep.equal(res2);     // value equality
              expect(retrieved[1]).not.to.equal(res2);      // not reference equality
              expect(retrieved[2]).to.deep.equal(res3);     // value equality
              expect(retrieved[2]).not.to.equal(res3);      // not reference equality
              done();
            });
          });
        });

        it("should only return resources that are in the collection", (done) => {
          let dataStore = new DataStoreClass();
          let res1 = new Resource("/users/JDoe", { name: "John Doe" });
          let res2 = new Resource("/people/BSmith", { name: "Bob Smith" });
          let res3 = new Resource("/users/SConnor", { name: "Sarah Connor" });
          let res4 = new Resource("/BBob", { name: "Billy Bob" });

          dataStore.save(res1, res2, res3, res4, () => {
            dataStore.getCollection("/users", (err, retrieved) => {
              if (err) {
                return done(err);
              }
              expect(retrieved).to.have.lengthOf(2);

              // Order should be retained
              expect(retrieved[0]).to.deep.equal(res1);     // value equality
              expect(retrieved[0]).not.to.equal(res1);      // not reference equality
              expect(retrieved[1]).to.deep.equal(res3);     // value equality
              expect(retrieved[1]).not.to.equal(res3);      // not reference equality
              done();
            });
          });
        });

        it("should only return strict, case-sensitive resources", (done) => {
          let dataStore = new DataStoreClass();
          dataStore.__router = helper.express();
          dataStore.__router.enable("case sensitive routing");
          dataStore.__router.enable("strict routing");

          let res1 = new Resource("/users/JDoe", { name: "John Doe 1" });
          let res2 = new Resource("/Users/JDoe", { name: "John Doe 2" });
          let res3 = new Resource("/users/jdoe", { name: "John Doe 3" });
          let res4 = new Resource("/Users/JDoe/", { name: "John Doe 4" });

          dataStore.save(res1, res2, res3, res4, () => {
            dataStore.getCollection("/Users", (err, retrieved) => {
              if (err) {
                return done(err);
              }
              expect(retrieved).to.have.lengthOf(2);

              // Order should be retained
              expect(retrieved[0]).to.deep.equal(res2);     // value equality
              expect(retrieved[0]).not.to.equal(res2);      // not reference equality
              expect(retrieved[1]).to.deep.equal(res4);     // value equality
              expect(retrieved[1]).not.to.equal(res4);      // not reference equality
              done();
            });
          });
        });

        it("can be called without a callback", () => {
          let dataStore = new DataStoreClass();
          dataStore.getCollection("/users");
        });
      });

      describe("deleteCollection", () => {
        it('should be aliased as "removeCollection"', () => {
          let dataStore = new DataStoreClass();
          expect(dataStore.deleteCollection).to.equal(dataStore.removeCollection);
        });

        it("should return an empty array if no resources are deleted", (done) => {
          let dataStore = new DataStoreClass();

          dataStore.deleteCollection("/foo/bar/baz", (err, deleted) => {
            if (err) {
              return done(err);
            }
            expect(deleted).to.have.lengthOf(0);
            done();
          });
        });

        it("should return an empty array if no resources matched", (done) => {
          let dataStore = new DataStoreClass();
          let saved = new Resource("/users/JDoe", { name: "John Doe" });

          dataStore.save(saved, () => {
            dataStore.deleteCollection("/people", (err, deleted) => {
              if (err) {
                return done(err);
              }
              expect(deleted).to.have.lengthOf(0);
              done();
            });
          });
        });

        it("should delete a one-resource collection", (done) => {
          let dataStore = new DataStoreClass();
          let saved = new Resource("/users/JDoe", { name: "John Doe" });

          dataStore.save(saved, () => {
            dataStore.deleteCollection("/Users", (err, deleted) => {
              if (err) {
                return done(err);
              }
              expect(deleted).to.have.lengthOf(1);
              expect(deleted[0]).to.deep.equal(saved);     // value equality
              expect(deleted[0]).not.to.equal(saved);      // not reference equality

              // Verify that the record was deleted
              dataStore.getCollection("/users", (err, retrieved) => {
                if (err) {
                  return done(err);
                }
                expect(retrieved).to.have.lengthOf(0);
                done();
              });
            });
          });
        });

        it("should delete a multiple-resource collection", (done) => {
          let dataStore = new DataStoreClass();
          let res1 = new Resource("/users/JDoe", { name: "John Doe" });
          let res2 = new Resource("/UsErS/BSmith", { name: "Bob Smith" });
          let res3 = new Resource("/Users/SConnor", { name: "Sarah Connor" });

          dataStore.save(res1, res2, res3, () => {
            dataStore.deleteCollection("Users", (err, deleted) => {
              if (err) {
                return done(err);
              }
              expect(deleted).to.have.lengthOf(3);

              // Order should be retained
              expect(deleted[0]).to.deep.equal(res1);     // value equality
              expect(deleted[0]).not.to.equal(res1);      // not reference equality
              expect(deleted[1]).to.deep.equal(res2);     // value equality
              expect(deleted[1]).not.to.equal(res2);      // not reference equality
              expect(deleted[2]).to.deep.equal(res3);     // value equality
              expect(deleted[2]).not.to.equal(res3);      // not reference equality

              // Verify that the records were deleted
              dataStore.getCollection("/Users", (err, retrieved) => {
                if (err) {
                  return done(err);
                }
                expect(retrieved).to.have.lengthOf(0);
                done();
              });
            });
          });
        });

        it("should only delete resources that are in the collection", (done) => {
          let dataStore = new DataStoreClass();
          let res1 = new Resource("/users/JDoe", { name: "John Doe" });
          let res2 = new Resource("/people/BSmith", { name: "Bob Smith" });
          let res3 = new Resource("/USERS/SConnor", { name: "Sarah Connor" });
          let res4 = new Resource("/BBob", { name: "Billy Bob" });

          dataStore.save(res1, res2, res3, res4, () => {
            dataStore.deleteCollection("/users", (err, deleted) => {
              if (err) {
                return done(err);
              }
              expect(deleted).to.have.lengthOf(2);

              // Order should be retained
              expect(deleted[0]).to.deep.equal(res1);     // value equality
              expect(deleted[0]).not.to.equal(res1);      // not reference equality
              expect(deleted[1]).to.deep.equal(res3);     // value equality
              expect(deleted[1]).not.to.equal(res3);      // not reference equality

              // Verify that the records were deleted
              dataStore.getCollection("/Users", (err, retrieved) => {
                if (err) {
                  return done(err);
                }
                expect(retrieved).to.have.lengthOf(0);
                done();
              });
            });
          });
        });

        it("should only delete strict, case-sensitive resources", (done) => {
          let dataStore = new DataStoreClass();
          dataStore.__router = helper.express();
          dataStore.__router.enable("case sensitive routing");
          dataStore.__router.enable("strict routing");

          let res1 = new Resource("/users/JDoe", { name: "John Doe 1" });
          let res2 = new Resource("/users/JDoe/", { name: "John Doe 2" });
          let res3 = new Resource("/Users/jdoe", { name: "John Doe 3" });
          let res4 = new Resource("/Users/JDoe", { name: "John Doe 4" });
          let res5 = new Resource("/Users/JDoe/", { name: "John Doe 5" });

          dataStore.save(res1, res2, res3, res4, res5, () => {
            dataStore.deleteCollection("/Users", (err, deleted) => {
              if (err) {
                return done(err);
              }
              expect(deleted).to.have.lengthOf(3);

              // Order should be retained
              expect(deleted[0]).to.deep.equal(res3);     // value equality
              expect(deleted[0]).not.to.equal(res3);      // not reference equality
              expect(deleted[1]).to.deep.equal(res4);     // value equality
              expect(deleted[1]).not.to.equal(res4);      // not reference equality
              expect(deleted[2]).to.deep.equal(res5);     // value equality
              expect(deleted[2]).not.to.equal(res5);      // not reference equality

              // Verify that the records were deleted
              dataStore.getCollection("/Users", (err, retrieved) => {
                if (err) {
                  return done(err);
                }
                expect(retrieved).to.have.lengthOf(0);

                // Verify that other records were NOT deleted
                dataStore.getCollection("/users", (err, retrieved) => {
                  if (err) {
                    return done(err);
                  }
                  expect(retrieved).to.have.lengthOf(2);
                  expect(retrieved[0]).to.deep.equal(res1);     // value equality
                  expect(retrieved[0]).not.to.equal(res1);      // not reference equality
                  expect(retrieved[1]).to.deep.equal(res2);     // value equality
                  expect(retrieved[1]).not.to.equal(res2);      // not reference equality
                  done();
                });
              });
            });
          });
        });

        it("can be called without a callback", () => {
          let dataStore = new DataStoreClass();
          dataStore.deleteCollection("/users");
        });
      });
    });
  });
});
