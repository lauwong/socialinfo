import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface UpvoteDoc extends BaseDoc {
  user: ObjectId;
  target: ObjectId;
}

export default class UpvoteConcept {

  public readonly upvotes;

  constructor(collectionName: string) {
    this.upvotes = new DocCollection<UpvoteDoc>(collectionName);
  }
  
  async cast(user: ObjectId, target: ObjectId) {
    await this.canCastVote(user, target);
    const _id = await this.upvotes.createOne({ user, target });
    return { msg: "Successfully upvoted!", context: await this.upvotes.readOne({ _id }) };
  }

  async retract(target: ObjectId) {
    await this.upvotes.deleteOne({ target });
    return { msg: "Upvote removed successfully!" };
  }

  async countVotes(target: ObjectId) {
    const votes = await this.upvotes.readMany({ target });
    return { msg: "Upvotes successfully tallied!", count: votes.length };
  }

  async getMostUpvoted(items: ObjectId[]) {

    let maxId;
    let max = -1;

    for (const _id of items) {
      const count = (await this.upvotes.readMany({ _id })).length;
      if (count > max) {
        max = count;
        maxId = _id;
      }
    }

    if (maxId) {
      return { msg: "Calculated most upvoted!", item: maxId, count: max };
    } else {
      throw new NotFoundError(`No contexts yet!`);
    }
    
  }

  private async canCastVote(user: ObjectId, target: ObjectId) {
    if (await this.upvotes.readOne({ user, target })) {
      throw new NotAllowedError(`User ${user} with has already upvoted item ${target}!`);
    }
  }

  async isVoter(user: ObjectId, target: ObjectId) {
    const upvote = await this.upvotes.readOne({ user, target });
    if (!upvote) {
      throw new NotAllowedError(`User ${user} has not upvoted ${target}!`);
    }
  }
}