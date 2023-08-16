import { Request, Response } from "express";
import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { Thread } from "../entities/Thread";
import {
  createThreadSchema,
  updateThreadSchema,
} from "../utils/validators/thread";
import { v2 as cloudinary } from "cloudinary";

class ThreadsService {
  private readonly threadRepository: Repository<Thread> =
    AppDataSource.getRepository(Thread);

  async find(req: Request, res: Response) {
    try {
      const threads = await this.threadRepository.find({
        relations: ["user", "likes", "replies"],
        order: {
          id: "DESC",
        },
      });

      let newResponse = [];

      threads.forEach((element) => {
        newResponse.push({
          ...element,
          replies_count: element.replies.length,
          likes_count: element.likes.length,
        });
      });

      return res.status(200).json(newResponse);
    } catch (err) {
      return res.status(500).json("Something wrong in server!");
    }
  }

  async findOne(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const thread = await this.threadRepository.findOne({
        where: {
          id: id,
        },
        relations: ["user", "replies", "likes"],
      });

      const newResponse = {
        ...thread,
        replies_count: thread.replies.length,
        likes_count: thread.likes.length,
      };

      return res.status(200).json(newResponse);
    } catch (err) {
      return res.status(500).json("Something wrong in server!");
    }
  }

  async create(req: Request, res: Response) {
    try {
      const image = res.locals.filename;

      const data = {
        content: req.body.content,
        image,
      };

      const loginSession = res.locals.loginSession;

      const { error } = createThreadSchema.validate(data);

      if (error) {
        return res.status(400).json({
          error: error,
        });
      }

      cloudinary.config({
        cloud_name: "dkg30pa5s",
        api_key: "538241327826783",
        api_secret: "Aba56Exrc2RYucZua1WHiaHiyR0",
      });

      const cloudinaryResponse = await cloudinary.uploader.upload(
        "./uploads/" + image
      );

      console.log("cloudinary response", cloudinaryResponse);

      // create object biar typenya sesuai
      const thread = this.threadRepository.create({
        content: data.content,
        image: cloudinaryResponse.secure_url,
        user: {
          id: loginSession.user.id,
        },
      });

      // insertion ke database
      const createdThread = this.threadRepository.save(thread);

      return res.status(200).json(thread);
    } catch (err) {
      return res.status(500).json("Something wrong in server!");
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const thread = await this.threadRepository.findOne({
        where: {
          id: id,
        },
      });

      const data = req.body;
      const { error } = updateThreadSchema.validate(data);

      if (error) {
        return res.status(400).json({
          error: error,
        });
      }

      // bikin pengecekan hanya delete threadnya ketika thread dengan id yg sesuai param itu ada
      if (!thread) {
        return res.status(404).json("Thread ID not found!");
      }

      if (data.content != "") {
        thread.content = data.content;
      }

      if (data.image != "") {
        thread.image = data.image;
      }

      const createdThread = await this.threadRepository.save(thread);
      return res.status(200).json(thread);
    } catch (err) {
      return res.status(500).json("Something wrong in server!");
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const thread = await this.threadRepository.findOne({
        where: {
          id: id,
        },
      });

      // bikin pengecekan hanya delete threadnya ketika thread dengan id yg sesuai param itu ada
      if (!thread) {
        return res.status(404).json("Thread ID not found!");
      }

      const deletedThread = this.threadRepository.delete({
        id: id,
      });

      return res.status(200).json(thread);
    } catch (err) {
      return res.status(500).json("Something wrong in server!");
    }
  }
}

export default new ThreadsService();
